/**
 * 简历数据验证工具
 */

// 邮箱验证
export const validateEmail = (email) => {
  if (!email) return { valid: false, message: '邮箱不能为空' };
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) return { valid: false, message: '邮箱格式不正确' };
  return { valid: true };
};

// 手机号验证（中国）
export const validatePhone = (phone) => {
  if (!phone) return { valid: false, message: '电话不能为空' };
  const regex = /^1[3-9]\d{9}$/;
  const cleaned = phone.replace(/[-\s]/g, '');
  if (!regex.test(cleaned)) return { valid: false, message: '手机号格式不正确' };
  return { valid: true };
};

// 姓名验证
export const validateName = (name) => {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: '姓名不能为空' };
  }
  if (name.trim().length < 2) {
    return { valid: false, message: '姓名至少需要2个字符' };
  }
  if (name.trim().length > 20) {
    return { valid: false, message: '姓名不能超过20个字符' };
  }
  return { valid: true };
};

// 日期验证
export const validateDate = (dateStr, fieldName = '日期') => {
  if (!dateStr) return { valid: false, message: `${fieldName}不能为空` };
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { valid: false, message: `${fieldName}格式不正确` };
  }
  return { valid: true };
};

// 日期范围验证
export const validateDateRange = (startDate, endDate, isCurrent = false) => {
  const startResult = validateDate(startDate, '开始时间');
  if (!startResult.valid) return startResult;

  if (!isCurrent) {
    if (!endDate) return { valid: false, message: '结束时间不能为空' };
    const endResult = validateDate(endDate, '结束时间');
    if (!endResult.valid) return endResult;

    if (new Date(startDate) > new Date(endDate)) {
      return { valid: false, message: '开始时间不能晚于结束时间' };
    }
  }

  return { valid: true };
};

// 工作经历验证
export const validateWorkExperience = (exp) => {
  const errors = [];

  if (!exp.company || exp.company.trim().length === 0) {
    errors.push('公司名称不能为空');
  }

  if (!exp.position || exp.position.trim().length === 0) {
    errors.push('职位不能为空');
  }

  const dateResult = validateDateRange(exp.start_date, exp.end_date, exp.is_current);
  if (!dateResult.valid) {
    errors.push(dateResult.message);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// 教育经历验证
export const validateEducation = (edu) => {
  const errors = [];

  if (!edu.school || edu.school.trim().length === 0) {
    errors.push('学校名称不能为空');
  }

  if (!edu.major || edu.major.trim().length === 0) {
    errors.push('专业不能为空');
  }

  const dateResult = validateDateRange(edu.start_date, edu.end_date);
  if (!dateResult.valid) {
    errors.push(dateResult.message);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// 项目经历验证
export const validateProject = (project) => {
  const errors = [];

  if (!project.name || project.name.trim().length === 0) {
    errors.push('项目名称不能为空');
  }

  if (project.start_date && project.end_date) {
    const dateResult = validateDateRange(project.start_date, project.end_date);
    if (!dateResult.valid) {
      errors.push(dateResult.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// 技能验证
export const validateSkill = (skill) => {
  const errors = [];

  if (!skill.name || skill.name.trim().length === 0) {
    errors.push('技能名称不能为空');
  }

  if (!skill.level || skill.level < 1 || skill.level > 5) {
    errors.push('技能等级必须在1-5之间');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// 个人信息完整验证
export const validatePersonalInfo = (info) => {
  const errors = {};

  const nameResult = validateName(info.full_name);
  if (!nameResult.valid) errors.full_name = nameResult.message;

  const emailResult = validateEmail(info.email);
  if (!emailResult.valid) errors.email = emailResult.message;

  const phoneResult = validatePhone(info.phone);
  if (!phoneResult.valid) errors.phone = phoneResult.message;

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

// 整份简历验证
export const validateResume = (resume) => {
  const result = {
    valid: true,
    errors: {},
    stats: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  // 验证个人信息
  if (resume.personal_info) {
    result.stats.total++;
    const personalResult = validatePersonalInfo(resume.personal_info);
    if (!personalResult.valid) {
      result.valid = false;
      result.errors.personal_info = personalResult.errors;
      result.stats.failed++;
    } else {
      result.stats.passed++;
    }
  }

  // 验证工作经历
  if (resume.work_experience?.length > 0) {
    result.errors.work_experience = [];
    resume.work_experience.forEach((exp, index) => {
      result.stats.total++;
      const expResult = validateWorkExperience(exp);
      if (!expResult.valid) {
        result.valid = false;
        result.errors.work_experience[index] = expResult.errors;
        result.stats.failed++;
      } else {
        result.stats.passed++;
      }
    });
  }

  // 验证教育经历
  if (resume.education?.length > 0) {
    result.errors.education = [];
    resume.education.forEach((edu, index) => {
      result.stats.total++;
      const eduResult = validateEducation(edu);
      if (!eduResult.valid) {
        result.valid = false;
        result.errors.education[index] = eduResult.errors;
        result.stats.failed++;
      } else {
        result.stats.passed++;
      }
    });
  }

  // 验证项目经历
  if (resume.projects?.length > 0) {
    result.errors.projects = [];
    resume.projects.forEach((project, index) => {
      result.stats.total++;
      const projectResult = validateProject(project);
      if (!projectResult.valid) {
        result.valid = false;
        result.errors.projects[index] = projectResult.errors;
        result.stats.failed++;
      } else {
        result.stats.passed++;
      }
    });
  }

  // 验证技能
  if (resume.skills?.length > 0) {
    result.errors.skills = [];
    resume.skills.forEach((skill, index) => {
      result.stats.total++;
      const skillResult = validateSkill(skill);
      if (!skillResult.valid) {
        result.valid = false;
        result.errors.skills[index] = skillResult.errors;
        result.stats.failed++;
      } else {
        result.stats.passed++;
      }
    });
  }

  return result;
};

// 获取验证错误提示文本
export const getValidationErrorText = (result) => {
  if (result.valid) return null;

  const messages = [];

  if (result.errors.personal_info) {
    Object.values(result.errors.personal_info).forEach(msg => messages.push(msg));
  }

  ['work_experience', 'education', 'projects', 'skills'].forEach(field => {
    if (result.errors[field]) {
      result.errors[field].forEach((errors, index) => {
        if (errors && errors.length > 0) {
          messages.push(...errors);
        }
      });
    }
  });

  return messages;
};
