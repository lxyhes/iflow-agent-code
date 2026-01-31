/**
 * 大厂真题库
 * 包含阿里、字节、腾讯、美团等公司的真实面试题
 */

export const companyQuestions = {
  alibaba: {
    name: '阿里巴巴',
    icon: '🏢',
    color: '#FF6A00',
    description: '重视技术深度、架构设计和业务理解',
    levels: {
      junior: {
        name: '初级 (P5)',
        questions: [
          {
            id: 'ali-j1',
            category: 'Java基础',
            question: 'HashMap和ConcurrentHashMap的区别？ConcurrentHashMap是如何实现线程安全的？',
            difficulty: '中等',
            keyPoints: ['数据结构', '线程安全', '并发机制', '锁粒度'],
            answer: 'HashMap是非线程安全的，使用数组+链表/红黑树结构。ConcurrentHashMap是线程安全的，JDK1.7使用分段锁，JDK1.8使用CAS+synchronized，锁粒度更细，只锁定链表头节点，提高并发性能。'
          },
          {
            id: 'ali-j2',
            category: '数据库',
            question: 'MySQL索引底层是什么结构？为什么用B+树而不是B树？',
            difficulty: '中等',
            keyPoints: ['B+树', '索引结构', '磁盘IO', '范围查询'],
            answer: 'MySQL索引使用B+树结构。相比B树，B+树所有数据都在叶子节点，非叶子节点只存索引，可以存储更多索引；叶子节点通过指针相连，范围查询更高效；查询性能更稳定，都要查到叶子节点。'
          },
          {
            id: 'ali-j3',
            category: 'Redis',
            question: 'Redis有哪些数据类型？分别适合什么场景？',
            difficulty: '基础',
            keyPoints: ['数据类型', '应用场景', '缓存策略'],
            answer: 'String：缓存、计数器；List：消息队列、时间线；Set：去重、交集并集；Hash：对象存储；ZSet：排行榜、延迟队列；Bitmap：签到、布隆过滤器；HyperLogLog：UV统计。'
          }
        ]
      },
      middle: {
        name: '中级 (P6)',
        questions: [
          {
            id: 'ali-m1',
            category: '分布式',
            question: '分布式事务有哪些解决方案？Seata的AT模式原理是什么？',
            difficulty: '困难',
            keyPoints: ['分布式事务', 'Seata', 'AT模式', 'TCC', ' Saga'],
            answer: '解决方案：2PC、3PC、TCC、Saga、本地消息表、Seata。Seata AT模式：一阶段执行业务SQL并记录undo_log，二阶段成功则删除undo_log，失败则根据undo_log回滚。通过全局锁保证写隔离。'
          },
          {
            id: 'ali-m2',
            category: 'JVM',
            question: 'JVM调优有哪些经验？如何排查OOM问题？',
            difficulty: '困难',
            keyPoints: ['JVM参数', 'GC调优', 'OOM排查', '内存分析'],
            answer: '调优：设置合适堆内存、选择GC算法（G1/ZGC）、调整GC参数。OOM排查：1）查看日志确定OOM类型；2）生成heap dump；3）使用MAT/VisualVM分析大对象；4）检查代码内存泄漏点；5）确认是否有大对象或内存泄漏。'
          },
          {
            id: 'ali-m3',
            category: '消息队列',
            question: 'RocketMQ和Kafka的区别？RocketMQ如何保证消息不丢失？',
            difficulty: '困难',
            keyPoints: ['消息队列', 'RocketMQ', 'Kafka', '消息可靠性'],
            answer: '区别：RocketMQ延迟消息、事务消息、消息轨迹更完善；Kafka吞吐更高。RocketMQ保证不丢失：1）生产者同步发送+失败重试；2）Broker主从同步刷盘；3）消费者手动ACK；4）开启事务消息。'
          }
        ]
      },
      senior: {
        name: '高级 (P7+)',
        questions: [
          {
            id: 'ali-s1',
            category: '架构设计',
            question: '设计一个秒杀系统，如何解决超卖、高并发问题？',
            difficulty: '困难',
            keyPoints: ['秒杀系统', '高并发', '超卖', '限流', '削峰'],
            answer: '1）前端：验证码、按钮置灰、CDN静态化；2）Nginx限流、黑名单；3）Redis预减库存，异步下单；4）RocketMQ削峰填谷；5）数据库乐观锁防超卖；6）多级缓存；7）服务熔断降级。'
          },
          {
            id: 'ali-s2',
            category: '微服务',
            question: '微服务架构下如何保证数据一致性？',
            difficulty: '困难',
            keyPoints: ['微服务', '数据一致性', '分布式事务', '最终一致性'],
            answer: '强一致性：分布式事务（Seata）。最终一致性：1）本地消息表；2）MQ事务消息；3）Saga模式；4）最大努力通知。选择依据：业务对一致性要求、性能要求、复杂度权衡。'
          }
        ]
      }
    }
  },

  bytedance: {
    name: '字节跳动',
    icon: '🎵',
    color: '#00C6FF',
    description: '重视算法、系统设计和快速迭代能力',
    levels: {
      junior: {
        name: '初级',
        questions: [
          {
            id: 'bd-j1',
            category: '算法',
            question: '实现LRU缓存，要求O(1)时间复杂度',
            difficulty: '中等',
            keyPoints: ['LRU', 'HashMap', '双向链表', 'O(1)复杂度'],
            answer: '使用HashMap+双向链表。HashMap存储key到节点的映射，实现O(1)查找。双向链表维护访问顺序，头部是最新访问，尾部是最旧。get时移动到头部，put时如果满则删除尾部。'
          },
          {
            id: 'bd-j2',
            category: 'Go',
            question: 'Go的GMP模型是什么？调度器如何工作？',
            difficulty: '中等',
            keyPoints: ['GMP', 'Goroutine', '调度器', 'M:N模型'],
            answer: 'GMP：G(Goroutine)、M(OS线程)、P(逻辑处理器)。P维护可运行G队列，M需要绑定P才能执行G。调度器：1）M从P本地队列取G执行；2）本地队列为空则从全局队列或其他P偷取；3）阻塞时M和G分离，P找其他M。'
          }
        ]
      },
      middle: {
        name: '中级',
        questions: [
          {
            id: 'bd-m1',
            category: '系统设计',
            question: '设计一个短链服务，如何支持每秒10万QPS？',
            difficulty: '困难',
            keyPoints: ['短链服务', '高并发', '布隆过滤器', '分库分表'],
            answer: '1）发号器：雪花算法或号段模式；2）62进制编码压缩URL；3）Redis缓存热点数据；4）布隆过滤器防止重复；5）分库分表存储映射关系；6）CDN加速跳转；7）预生成短链池。'
          },
          {
            id: 'bd-m2',
            category: '网络',
            question: 'HTTP/2和HTTP/3的区别？QUIC协议优势？',
            difficulty: '困难',
            keyPoints: ['HTTP/2', 'HTTP/3', 'QUIC', 'TCP', 'UDP'],
            answer: 'HTTP/2：多路复用、头部压缩、服务端推送，但基于TCP有队头阻塞。HTTP/3基于QUIC（UDP），解决队头阻塞，0-RTT握手，连接迁移，前向纠错。QUIC优势：低延迟、抗丢包、连接迁移。'
          }
        ]
      },
      senior: {
        name: '高级',
        questions: [
          {
            id: 'bd-s1',
            category: '架构',
            question: '设计一个推荐系统的架构，如何实现实时推荐？',
            difficulty: '困难',
            keyPoints: ['推荐系统', '实时计算', 'Flink', '特征工程'],
            answer: '离线：Spark批处理生成用户画像、物品相似度。近实时：Flink处理点击流，更新用户实时兴趣。在线：召回（多路召回）→ 粗排 → 精排（深度学习模型）→ 重排（多样性、业务规则）。'
          }
        ]
      }
    }
  },

  tencent: {
    name: '腾讯',
    icon: '🐧',
    color: '#00A8FF',
    description: '重视基础、业务理解和团队协作',
    levels: {
      junior: {
        name: '初级',
        questions: [
          {
            id: 'tx-j1',
            category: 'C++',
            question: 'C++智能指针有哪些？shared_ptr循环引用怎么解决？',
            difficulty: '中等',
            keyPoints: ['智能指针', 'shared_ptr', 'weak_ptr', '内存管理'],
            answer: 'unique_ptr（独占所有权）、shared_ptr（共享所有权）、weak_ptr（弱引用，不增加计数）。循环引用解决：使用weak_ptr打破循环，weak_ptr不增加引用计数，不会阻止对象销毁。'
          },
          {
            id: 'tx-j2',
            category: '操作系统',
            question: '进程和线程的区别？线程切换开销在哪里？',
            difficulty: '中等',
            keyPoints: ['进程', '线程', '上下文切换', '虚拟内存'],
            answer: '进程是资源分配单位，线程是CPU调度单位。线程切换开销：保存/恢复寄存器、程序计数器、栈指针；切换页表（如果是进程）；CPU缓存失效；TLB刷新。线程切换比进程快，因为共享地址空间。'
          }
        ]
      },
      middle: {
        name: '中级',
        questions: [
          {
            id: 'tx-m1',
            category: '网络',
            question: 'TCP三次握手和四次挥手？为什么不是两次？',
            difficulty: '中等',
            keyPoints: ['TCP', '三次握手', '四次挥手', '可靠传输'],
            answer: '三次握手：同步序列号，确认双方收发能力。两次不行：无法确认客户端接收能力，可能产生历史连接。四次挥手：全双工通信，双方都要发送FIN和ACK，确保数据完整传输。TIME_WAIT等待2MSL确保ACK到达。'
          },
          {
            id: 'tx-m2',
            category: '设计模式',
            question: '项目中用过哪些设计模式？单例模式怎么实现线程安全？',
            difficulty: '中等',
            keyPoints: ['设计模式', '单例模式', '线程安全', '懒汉式'],
            answer: '常用：工厂、单例、策略、观察者、装饰器。线程安全单例：1）饿汉式（类加载初始化）；2）双重检查锁定（DCL，volatile+ synchronized）；3）静态内部类；4）枚举（最佳方式，防反射和序列化）。'
          }
        ]
      },
      senior: {
        name: '高级',
        questions: [
          {
            id: 'tx-s1',
            category: '架构',
            question: '如何设计一个支持千万级在线的IM系统？',
            difficulty: '困难',
            keyPoints: ['IM系统', '长连接', '消息可靠', '水平扩展'],
            answer: '1）接入层：Netty长连接网关，支持百万连接；2）路由层：用户ID哈希找到对应接入服务器；3）消息层：消息队列异步处理，消息落库；4）存储：消息分库分表，最近消息放Redis；5）推送：APNs/FCM离线推送；6）ACK机制保证消息可靠。'
          }
        ]
      }
    }
  },

  meituan: {
    name: '美团',
    icon: '🍔',
    color: '#FFD100',
    description: '重视业务理解、系统稳定性和性能优化',
    levels: {
      junior: {
        name: '初级',
        questions: [
          {
            id: 'mt-j1',
            category: 'Java',
            question: 'ArrayList和LinkedList的区别？什么场景下用哪个？',
            difficulty: '基础',
            keyPoints: ['ArrayList', 'LinkedList', '时间复杂度', '随机访问'],
            answer: 'ArrayList：数组实现，随机访问O(1)，插入删除O(n)，适合查询多。LinkedList：双向链表，随机访问O(n)，插入删除O(1)，适合频繁增删。内存：ArrayList更紧凑，LinkedList需要额外指针空间。'
          }
        ]
      },
      middle: {
        name: '中级',
        questions: [
          {
            id: 'mt-m1',
            category: '性能优化',
            question: '接口响应慢怎么排查？从哪些方面优化？',
            difficulty: '中等',
            keyPoints: ['性能优化', '慢查询', ' profiling', 'JVM'],
            answer: '排查：1）日志定位慢接口；2）Arthas/trace分析耗时；3）检查SQL慢查询；4）查看GC情况；5）网络延迟。优化：1）SQL加索引、优化查询；2）加缓存Redis；3）异步处理；4）JVM调优；5）代码优化，减少循环调用。'
          }
        ]
      },
      senior: {
        name: '高级',
        questions: [
          {
            id: 'mt-s1',
            category: '高可用',
            question: '如何设计一个高可用的外卖订单系统？',
            difficulty: '困难',
            keyPoints: ['高可用', '订单系统', '幂等', '降级'],
            answer: '1）多机房部署，异地多活；2）订单状态机保证幂等；3）库存预扣+超时释放；4）熔断降级（Hystrix/Sentinel）；5）限流保护；6）对账补偿机制；7）监控告警；8）容灾演练。'
          }
        ]
      }
    }
  }
};

// 按难度筛选问题
export const getQuestionsByLevel = (level) => {
  const questions = [];
  Object.entries(companyQuestions).forEach(([companyKey, company]) => {
    if (company.levels[level]) {
      company.levels[level].questions.forEach(q => {
        questions.push({
          ...q,
          company: company.name,
          companyIcon: company.icon,
          level: company.levels[level].name
        });
      });
    }
  });
  return questions;
};

// 按公司筛选问题
export const getQuestionsByCompany = (companyKey) => {
  const company = companyQuestions[companyKey];
  if (!company) return [];
  
  const questions = [];
  Object.entries(company.levels).forEach(([levelKey, level]) => {
    level.questions.forEach(q => {
      questions.push({
        ...q,
        company: company.name,
        companyIcon: company.icon,
        level: level.name
      });
    });
  });
  return questions;
};

// 获取所有问题
export const getAllQuestions = () => {
  const questions = [];
  Object.entries(companyQuestions).forEach(([companyKey, company]) => {
    Object.entries(company.levels).forEach(([levelKey, level]) => {
      level.questions.forEach(q => {
        questions.push({
          ...q,
          company: company.name,
          companyIcon: company.icon,
          level: level.name
        });
      });
    });
  });
  return questions;
};

export default companyQuestions;
