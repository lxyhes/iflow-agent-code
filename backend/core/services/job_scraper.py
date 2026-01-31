"""
招聘网页爬取服务

使用 Playwright 爬取招聘网站内容，提取职位信息。
"""

import asyncio
import logging
import random
from typing import Optional, Dict, Any
from urllib.parse import urlparse

from playwright.async_api import async_playwright, Page, Browser
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


class JobScraper:
    """招聘网页爬取器"""

    def __init__(self):
        self.browser: Optional[Browser] = None
        self.playwright = None

    async def __aenter__(self):
        """异步上下文管理器入口"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
            ]
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """异步上下文管理器出口"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()

    async def scrape_job_page(self, url: str) -> Dict[str, Any]:
        """
        爬取招聘网页内容

        Args:
            url: 招聘网页URL

        Returns:
            包含页面标题、正文内容、结构化数据的字典
        """
        if not self.browser:
            raise RuntimeError("Scraper not initialized. Use async with statement.")

        page = await self.browser.new_page()

        try:
            # 设置用户代理和视口
            await page.set_extra_http_headers({
                'User-Agent': self._get_random_user_agent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0',
            })

            await page.set_viewport_size({'width': 1920, 'height': 1080})

            # 访问页面
            logger.info(f"正在访问: {url}")
            
            # 随机延迟，模拟人类行为
            await asyncio.sleep(random.uniform(1, 3))
            
            response = await page.goto(url, wait_until='networkidle', timeout=60000)
            
            if not response:
                raise Exception("页面加载失败，无响应")
            
            if response.status >= 400:
                raise Exception(f"页面加载失败，状态码: {response.status}")

            # 等待页面加载完成
            await asyncio.sleep(random.uniform(3, 5))

            # 模拟滚动，加载懒加载内容
            await self._simulate_scroll(page)

            # 获取页面内容
            html_content = await page.content()
            page_title = await page.title()

            logger.info(f"页面标题: {page_title}")

            # 使用 BeautifulSoup 解析
            soup = BeautifulSoup(html_content, 'lxml')

            # 提取文本内容
            text_content = self._extract_text(soup)

            # 根据网站类型提取结构化数据
            site_type = self._identify_site_type(url)
            structured_data = self._extract_structured_data(soup, site_type)

            logger.info(f"提取完成，来源: {site_type}, 职位: {structured_data.get('job_title', 'N/A')}")

            return {
                'url': url,
                'title': page_title,
                'html': html_content,
                'text': text_content,
                'structured': structured_data,
                'site_type': site_type,
            }

        except Exception as e:
            logger.error(f"爬取页面失败: {url}, 错误: {e}")
            raise

        finally:
            await page.close()

    async def _simulate_scroll(self, page: Page):
        """模拟人类滚动行为"""
        try:
            # 获取页面高度
            height = await page.evaluate('document.body.scrollHeight')
            
            # 分段滚动
            steps = random.randint(3, 6)
            for i in range(steps):
                scroll_y = int(height * (i + 1) / steps)
                await page.evaluate(f'window.scrollTo(0, {scroll_y})')
                await asyncio.sleep(random.uniform(0.5, 1.5))
            
            # 滚动回顶部
            await page.evaluate('window.scrollTo(0, 0)')
            await asyncio.sleep(0.5)
            
        except Exception as e:
            logger.warning(f"滚动模拟失败: {e}")

    def _get_random_user_agent(self) -> str:
        """获取随机User-Agent"""
        user_agents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        ]
        return random.choice(user_agents)

    def _extract_text(self, soup: BeautifulSoup) -> str:
        """提取页面正文文本"""
        # 移除脚本和样式
        for script in soup(['script', 'style', 'nav', 'footer', 'header']):
            script.decompose()

        # 获取文本
        text = soup.get_text(separator='\n', strip=True)

        # 清理文本
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        return '\n'.join(lines)

    def _identify_site_type(self, url: str) -> str:
        """识别招聘网站类型"""
        domain = urlparse(url).netloc.lower()

        if 'zhipin.com' in domain:
            return 'boss'
        elif 'lagou.com' in domain:
            return 'lagou'
        elif 'liepin.com' in domain:
            return 'liepin'
        elif 'zhaopin.com' in domain:
            return 'zhaopin'
        elif '51job.com' in domain:
            return '51job'
        elif 'maimai.cn' in domain:
            return 'maimai'
        else:
            return 'unknown'

    def _extract_structured_data(self, soup: BeautifulSoup, site_type: str) -> Dict[str, Any]:
        """根据网站类型提取结构化数据"""
        extractors = {
            'boss': self._extract_boss_data,
            'lagou': self._extract_lagou_data,
            'liepin': self._extract_liepin_data,
            'zhaopin': self._extract_zhaopin_data,
            '51job': self._extract_51job_data,
            'maimai': self._extract_maimai_data,
        }

        extractor = extractors.get(site_type, self._extract_generic_data)
        return extractor(soup)

    def _extract_boss_data(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """提取 BOSS直聘 数据"""
        data = {
            'job_title': '',
            'company': '',
            'salary': '',
            'location': '',
            'experience': '',
            'education': '',
            'description': '',
            'requirements': '',
        }

        try:
            # 职位名称 - 多种选择器尝试
            selectors = ['.job-name', '.name', 'h1', '.job-title', '[class*="job"][class*="name"]', '.job-banner .name']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['job_title'] = elem.get_text(strip=True)
                    break

            # 公司名称
            selectors = ['.company-name', '.company', '.firm-name', '.company-info .name', '[class*="company"]', '.job-banner .company']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['company'] = elem.get_text(strip=True)
                    break

            # 薪资
            selectors = ['.salary', '.job-salary', '.salary-box', '[class*="salary"]', '.job-banner .salary']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['salary'] = elem.get_text(strip=True)
                    break

            # 地点
            selectors = ['.location', '.job-location', '.text-city', '.job-area', '[class*="location"]', '.job-banner .location']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['location'] = elem.get_text(strip=True)
                    break

            # 经验要求
            selectors = ['.job-limit .exp', '.exp', '.text-experience', '[class*="experience"]', '.job-banner .exp']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['experience'] = elem.get_text(strip=True)
                    break

            # 学历要求
            selectors = ['.job-limit .degree', '.degree', '.text-education', '[class*="degree"]', '.job-banner .degree']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['education'] = elem.get_text(strip=True)
                    break

            # 职位描述
            selectors = ['.job-sec-text', '.job-description', '.detail-content', '.job-section', '[class*="description"]', '.job-detail-section .text']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['description'] = elem.get_text(separator='\n', strip=True)
                    break

            # 技能标签
            tags = soup.select('.tag-list .tag, .job-tags .tag, .labels .label, [class*="tag"], .job-banner .tag')
            data['skills'] = [tag.get_text(strip=True) for tag in tags if tag.get_text(strip=True) and len(tag.get_text(strip=True)) < 50]

            # 去重
            data['skills'] = list(set(data['skills']))

        except Exception as e:
            logger.error(f"提取BOSS直聘数据失败: {e}")

        return data

    def _extract_lagou_data(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """提取 拉勾网 数据"""
        data = {
            'job_title': '',
            'company': '',
            'salary': '',
            'location': '',
            'experience': '',
            'education': '',
            'description': '',
            'requirements': '',
        }

        try:
            # 职位名称
            selectors = ['.job-name', '.position-name', 'h1 span', 'h1', '.job-title']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['job_title'] = elem.get_text(strip=True)
                    break

            # 公司名称
            selectors = ['.company-name', '.job-company-name', '.company', '[class*="company"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['company'] = elem.get_text(strip=True)
                    break

            # 薪资
            selectors = ['.salary', '.job-salary', '.salary-box', '[class*="salary"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['salary'] = elem.get_text(strip=True)
                    break

            # 地点
            selectors = ['.work_addr', '.job-address', '.location', '[class*="address"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['location'] = elem.get_text(strip=True)
                    break

            # 职位描述
            selectors = ['.job-detail', '.job-description', '.content', '.position-desc', '[class*="description"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['description'] = elem.get_text(separator='\n', strip=True)
                    break

            # 技能标签
            tags = soup.select('.position-label .labels, .job-labels .label, .labels .label, [class*="label"]')
            data['skills'] = [tag.get_text(strip=True) for tag in tags if tag.get_text(strip=True) and len(tag.get_text(strip=True)) < 50]
            data['skills'] = list(set(data['skills']))

        except Exception as e:
            logger.error(f"提取拉勾网数据失败: {e}")

        return data

    def _extract_liepin_data(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """提取 猎聘网 数据"""
        data = {
            'job_title': '',
            'company': '',
            'salary': '',
            'location': '',
            'experience': '',
            'education': '',
            'description': '',
        }

        try:
            # 职位名称
            selectors = ['.title-box h1', '.job-title', 'h1', '[class*="title"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['job_title'] = elem.get_text(strip=True)
                    break

            # 公司名称
            selectors = ['.company-name', '.title-box .company', '.company', '[class*="company"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['company'] = elem.get_text(strip=True)
                    break

            # 薪资
            selectors = ['.salary', '.job-salary', '.salary-box', '[class*="salary"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['salary'] = elem.get_text(strip=True)
                    break

            # 职位描述
            selectors = ['.job-description', '.content-word', '.job-content', '.position-desc', '[class*="description"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['description'] = elem.get_text(separator='\n', strip=True)
                    break

        except Exception as e:
            logger.error(f"提取猎聘网数据失败: {e}")

        return data

    def _extract_zhaopin_data(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """提取 智联招聘 数据"""
        data = {
            'job_title': '',
            'company': '',
            'salary': '',
            'location': '',
            'experience': '',
            'education': '',
            'description': '',
        }

        try:
            # 职位名称
            selectors = ['.job-name', '.summary-plane__title', 'h1', '.position-name', '[class*="job"][class*="name"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['job_title'] = elem.get_text(strip=True)
                    break

            # 公司名称
            selectors = ['.company-name', '.summary-plane__company-name', '.company', '[class*="company"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['company'] = elem.get_text(strip=True)
                    break

            # 薪资
            selectors = ['.summary-plane__salary', '.job-salary', '.salary', '[class*="salary"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['salary'] = elem.get_text(strip=True)
                    break

            # 职位描述
            selectors = ['.desc-content', '.job-description', '.job-content', '.position-desc', '[class*="description"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['description'] = elem.get_text(separator='\n', strip=True)
                    break

        except Exception as e:
            logger.error(f"提取智联招聘数据失败: {e}")

        return data

    def _extract_51job_data(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """提取 前程无忧 数据"""
        data = {
            'job_title': '',
            'company': '',
            'salary': '',
            'location': '',
            'experience': '',
            'education': '',
            'description': '',
        }

        try:
            # 职位名称
            selectors = ['.job-name', '.cn h1', '.in h1', 'h1', '.position-name', '[class*="job"][class*="name"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['job_title'] = elem.get_text(strip=True)
                    break

            # 公司名称
            selectors = ['.company-name', '.cname a', '.company', '[class*="company"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['company'] = elem.get_text(strip=True)
                    break

            # 薪资
            selectors = ['.salary', '.cn strong', '.salary-box', '[class*="salary"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['salary'] = elem.get_text(strip=True)
                    break

            # 职位描述
            selectors = ['.job-message', '.bmsg.job_msg', '.job-content', '.position-desc', '[class*="description"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['description'] = elem.get_text(separator='\n', strip=True)
                    break

        except Exception as e:
            logger.error(f"提取前程无忧数据失败: {e}")

        return data

    def _extract_maimai_data(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """提取 脉脉 数据"""
        data = {
            'job_title': '',
            'company': '',
            'salary': '',
            'location': '',
            'description': '',
        }

        try:
            # 职位名称
            selectors = ['.job-title', '.position-name', 'h1', '[class*="job"][class*="title"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['job_title'] = elem.get_text(strip=True)
                    break

            # 公司名称
            selectors = ['.company-name', '.employer-name', '.company', '[class*="company"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['company'] = elem.get_text(strip=True)
                    break

            # 职位描述
            selectors = ['.job-desc', '.position-desc', '.job-content', '.description', '[class*="desc"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['description'] = elem.get_text(separator='\n', strip=True)
                    break

        except Exception as e:
            logger.error(f"提取脉脉数据失败: {e}")

        return data

    def _extract_generic_data(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """通用数据提取"""
        data = {
            'job_title': '',
            'company': '',
            'salary': '',
            'location': '',
            'experience': '',
            'education': '',
            'description': '',
        }

        try:
            # 尝试提取标题
            selectors = ['h1', '.job-title', '.position-title', '.title', '[class*="title"]']
            for selector in selectors:
                elem = soup.select_one(selector)
                if elem and elem.get_text(strip=True):
                    data['job_title'] = elem.get_text(strip=True)
                    break

            # 提取所有文本作为描述
            body = soup.select_one('body')
            if body:
                data['description'] = self._extract_text(soup)

        except Exception as e:
            logger.error(f"通用数据提取失败: {e}")

        return data


# 便捷函数
async def scrape_job_page(url: str) -> Dict[str, Any]:
    """
    便捷函数：爬取招聘网页

    Args:
        url: 招聘网页URL

    Returns:
        页面数据字典
    """
    async with JobScraper() as scraper:
        return await scraper.scrape_job_page(url)
