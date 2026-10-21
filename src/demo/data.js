import { demoPhoto } from './demo-photo.js';

// Entirely fictional demo persona. No content is derived from a user's resume.
export const demoRegion = '杭州';
export const demoRoles = [
  {
    zh: '市场营销 / 产品运营',
    en: 'Marketing / Product Operations',
    salary: '8–10K',
  },
  {
    zh: '跨境电商运营',
    en: 'Cross-border E-commerce Operations',
    salary: '8–10K',
    order: [2, 0, 1],
  },
  {
    zh: '内容运营 / 内容营销',
    en: 'Content Operations / Content Marketing',
    salary: '8–10K',
    order: [1, 0, 2],
  },
  {
    zh: '产品运营 / 产品助理',
    en: 'Product Operations / Product Assistant',
    salary: '8–10K',
  },
  {
    zh: '市场营销',
    en: 'Marketing',
    salary: '6–8K',
  },
];

export const defaultState = {
  version: 1,
  language: 'zh',
  meta: {
    title: '市场营销 / 产品运营 8–10K 杭州',
  },
  style: {
    fontCN: 'Arial Unicode MS',
    fontEN: 'Arial',
    bodySize: 10,
    titleSize: 22,
    lineHeight: 1.25,
    marginMm: 16,
    accent: '#111111',
  },
  profiles: {
    zh: {
      basics: {
        name: '陈知遥',
        phone: '000-0000-0000',
        email: 'zhiyao.chen@example.com',
        target: '市场营销 / 产品运营',
        links: '虚构演示 · 经历与数据均为示例',
        salary: '8–10K',
        photo: demoPhoto,
        photoOriginal: demoPhoto,
        photoPosition: 'center',
      },
      education: [
        {
          id: 'demo-zh-edu-1',
          school: '杭川应用大学（虚构）',
          degree: '本科',
          major: '市场营销',
          start: '2020-09',
          end: '2024-06',
          gpa: '',
          rank: '',
          courses: '消费者行为、数字营销、品牌管理、用户研究、商业统计。',
        },
      ],
      experience: [
        {
          id: 'demo-zh-exp-1',
          company: '森语集数字零售（虚构）',
          role: '电商运营助理',
          start: '2025-07',
          end: '2026-09',
          bullets: [
            '维护生活方式品牌 Shopify 英文站的商品信息、分类及常见问题，整理产品卖点，协助新品上线与页面检查。',
            '汇总客户咨询和商品反馈，制作周度记录，协助产品与内容团队调整商品介绍、购买指引和展示素材。',
            '使用 Excel 整理商品页面访问与加购数据，对比内容调整前后的表现，支持周度运营复盘。',
          ],
        },
        {
          id: 'demo-zh-exp-2',
          company: '知野内容工作室（虚构）',
          role: '内容运营助理',
          start: '2024-07',
          end: '2025-06',
          bullets: [
            '围绕生活方式品牌制定内容日历，撰写英文短视频脚本与社交媒体图文，参与选题、拍摄和剪辑。',
            '使用即梦生成视觉草稿与视频片段，结合 ChatGPT 和 Canva AI 制作提案素材，人工核对产品信息与英文表达。',
            '维护图片与视频素材库，按主题、用途和版本归档；记录内容互动表现，为后续选题与素材改进提供参考。',
          ],
        },
      ],
      projects: [
        {
          id: 'demo-zh-project-1',
          title: '城市周末观察笔记（虚构）',
          award: '个人内容项目',
          start: '2025-03',
          end: '2026-08',
          bullets: [
            '围绕杭州公共空间与周末活动制作图文和短视频，完成主题策划、现场拍摄、英文摘要与素材归档。',
            '以统一模板记录选题、制作进度和读者反馈，持续调整信息结构与封面呈现。',
          ],
        },
        {
          id: 'demo-zh-project-2',
          title: '校园闲置交换小站（虚构）',
          award: '校园实践项目',
          start: '2023-09',
          end: '2024-03',
          bullets: [
            '通过问卷收集同学的闲置交换需求，设计信息发布表单、物品分类与交换流程。',
            '组织两次校园试运行，整理报名、现场咨询和使用反馈，形成流程改进清单。',
          ],
        },
      ],
      skills: [
        {
          id: 'demo-zh-skill-1',
          label: '英语沟通',
          text: '可撰写商品介绍、邮件及简短视频脚本，支持日常英文工作沟通与资料阅读。',
        },
        {
          id: 'demo-zh-skill-2',
          label: 'AI 内容创作',
          text: '即梦生成视觉草稿与视频片段；ChatGPT 辅助英文文案；Canva AI 制作图文素材，保留人工事实与表达核对。',
        },
        {
          id: 'demo-zh-skill-3',
          label: '工具与方法',
          text: 'Shopify 商品维护、Excel 数据整理、PowerPoint、Canva、剪映；基础摄影、问卷设计、内容日历及素材版本管理。',
        },
      ],
    },
    en: {
      basics: {
        name: 'ZHIYAO CHEN',
        phone: '000-0000-0000',
        email: 'zhiyao.chen@example.com',
        target: 'Marketing / Product Operations',
        links: 'Fictional demo · All details are examples',
        salary: '8–10K',
        photo: demoPhoto,
        photoOriginal: demoPhoto,
        photoPosition: 'center',
      },
      education: [
        {
          id: 'demo-en-edu-1',
          school: 'Hangchuan University of Applied Studies (Fictional)',
          degree: 'Bachelor’s Degree',
          major: 'Marketing',
          start: '2020-09',
          end: '2024-06',
          gpa: '',
          rank: '',
          courses:
            'Consumer Behavior, Digital Marketing, Brand Management, User Research and Business Statistics.',
        },
      ],
      experience: [
        {
          id: 'demo-en-exp-1',
          company: 'Senyu Digital Retail (Fictional)',
          role: 'E-commerce Operations Assistant',
          start: '2025-07',
          end: '2026-09',
          bullets: [
            'Maintained product information, collections and FAQs for an English-language Shopify lifestyle store; organized selling points and supported launch checks.',
            'Consolidated customer questions and product feedback into weekly summaries to help refine descriptions, buying guides and visual assets.',
            'Organized product-page visits and add-to-cart data in Excel, comparing performance before and after content changes for weekly reviews.',
          ],
        },
        {
          id: 'demo-en-exp-2',
          company: 'Zhiye Content Studio (Fictional)',
          role: 'Content Operations Assistant',
          start: '2024-07',
          end: '2025-06',
          bullets: [
            'Created content calendars, English short-video scripts and social posts for lifestyle brands; supported topic planning, filming and editing.',
            'Used Jimeng for visual concepts and video clips, with ChatGPT and Canva AI for proposal assets; manually checked product facts and English copy.',
            'Organized images and videos by theme, use and version, and tracked engagement to inform future topics and creative improvements.',
          ],
        },
      ],
      projects: [
        {
          id: 'demo-en-project-1',
          title: 'Weekend City Notes (Fictional)',
          award: 'Personal Content Project',
          start: '2025-03',
          end: '2026-08',
          bullets: [
            'Produced photo stories and short videos about public spaces and weekend activities in Hangzhou, including planning, filming, English summaries and asset organization.',
            'Maintained a consistent tracker for topics, production progress and reader feedback to refine information structure and cover design.',
          ],
        },
        {
          id: 'demo-en-project-2',
          title: 'Campus Swap Hub (Fictional)',
          award: 'Student Project',
          start: '2023-09',
          end: '2024-03',
          bullets: [
            'Surveyed students about exchanging unused items and designed a submission form, item categories and an exchange process.',
            'Organized two campus trials and summarized registrations, on-site questions and user feedback into a process improvement list.',
          ],
        },
      ],
      skills: [
        {
          id: 'demo-en-skill-1',
          label: 'English',
          text: 'Product descriptions, business emails, short-video scripts, everyday workplace communication and reference reading.',
        },
        {
          id: 'demo-en-skill-2',
          label: 'AI Content Creation',
          text: 'Jimeng for visual concepts and video clips; ChatGPT for English copywriting assistance; Canva AI for visual content, with manual fact and language checks.',
        },
        {
          id: 'demo-en-skill-3',
          label: 'Tools and Methods',
          text: 'Shopify product maintenance, Excel, PowerPoint, Canva and CapCut; basic photography, survey design, content calendars and asset version control.',
        },
      ],
    },
  },
};

export default defaultState;
