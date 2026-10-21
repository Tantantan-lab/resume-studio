// Interface language is independent from the Chinese/English resume profiles.
// No DOM or storage access happens until initInterfaceLanguage() is called.
export const INTERFACE_STORAGE_KEY = 'resume-studio.v1.ui-language';

const english = new Map(
  Object.entries({
    简历工坊: 'Resume Studio',
    '简历工坊 · Resume Studio': 'Resume Studio',
    版本记录: 'Version history',
    导入简历: 'Import resume',
    下载: 'Download',
    'Word（与预览一致）': 'Word (matches preview)',
    '.docx · 图片版': '.docx · Image based',
    'Word（可编辑）': 'Word (editable)',
    '.docx · 排版近似': '.docx · Approximate layout',
    'PDF（图片版）': 'PDF (image based)',
    'A4 · 与预览一致': 'A4 · Matches preview',
    'PDF（文字版）': 'PDF (selectable text)',
    '可搜索/复制 · 打印另存': 'Searchable text · Save via print',
    图片: 'Image',
    '.png · 适合直接发送': '.png · Ready to share',
    'JSON 数据': 'JSON data',
    完整双语内容与排版: 'Both languages and layout',
    我的: 'MY WORKSPACE',
    我的简历: 'My resumes',
    简历内容: 'RESUME CONTENT',
    编辑工具: 'EDITOR TOOLS',
    纸面设计: 'Paper design',
    岗位词库: 'Role vocabulary',
    编辑模块: 'Editing sections',
    材料留在浏览器: 'Your data stays in this browser',
    '自动保存至本机。导入的文件由浏览器处理。':
      'Saved locally. Imported files are processed in your browser.',
    使用说明: 'How to use',
    简历编辑: 'Resume editor',
    简历语言: 'Resume language',
    切换中英文简历: 'Switch between Chinese and English resumes',
    '切换中英文简历 / Toggle resume language': 'Switch between Chinese and English resumes',
    '切换到中文简历 / Switch to Chinese': 'Switch to Chinese resume',
    '切换英文简历 / Switch to English': 'Switch to English resume',
    内容编辑: 'Content editor',
    简历预览: 'Resume preview',
    实时预览: 'Live preview',
    一页预览: '1-page preview',
    缩小预览: 'Zoom out',
    放大预览: 'Zoom in',
    排版与内容同步更新: 'Layout and content update together',
    已保存到本机: 'Saved locally',
    '正在保存…': 'Saving…',
    '本机存储已满，请导出 JSON': 'Local storage is full. Export JSON to back up your work.',
    基本信息: 'Profile',
    教育背景: 'Education',
    工作经历: 'Experience',
    项目经历: 'Projects',
    专业技能: 'Skills',
    '先完善联系信息，再让招聘方一眼看到你的求职方向。':
      'Add your contact details and make your target role easy to see.',
    '优先保留与目标岗位相关的课程和学业表现。':
      'Prioritize coursework and academic results relevant to your target role.',
    '用具体行动、工作产出和可核实的结果说明你做了什么。':
      'Describe your actions, deliverables, and verifiable results.',
    '突出与你申请岗位相关的实践，清楚标明模拟项目。':
      'Highlight relevant projects and clearly label simulated work.',
    '工具写到具体用途，专业词汇与真实经历对应。':
      'Explain how you used each tool and link terminology to real experience.',
    '为简历选择版式，再调整主题色、照片、字体与留白。设置随当前简历保存。':
      'Choose a layout, then adjust its color, photo, typography, and spacing. Settings are saved with this resume.',
    岗位专业词库: 'Professional vocabulary',
    '来自公开岗位资料整理，结合你的经历标注使用依据。':
      'Vocabulary from public job descriptions. Confirm it matches your own experience.',
    上移条目: 'Move entry up',
    下移条目: 'Move entry down',
    删除条目: 'Delete entry',
    姓名: 'Name',
    填写你的姓名: 'Your full name',
    联系电话: 'Phone',
    方便联系的手机号码: 'A phone number where you can be reached',
    邮箱: 'Email',
    求职意向: 'Target role',
    '例如 市场营销 / 产品运营': 'e.g. Marketing / Product Operations',
    期望薪资: 'Expected salary',
    '例如 6–8K / 面议': 'e.g. 6–8K / Negotiable',
    '作品集 / 个人主页': 'Portfolio / Website',
    '可选，填写链接': 'Optional website link',
    '中英文内容分开保存。切换语言后，可分别完善姓名拼写、职位名称和英文表达。':
      'Chinese and English resume content is saved separately. Switch resume language to edit each version.',
    学校: 'School',
    专业: 'Major / Field of study',
    学历: 'Degree',
    开始时间: 'Start date',
    结束时间: 'End date',
    '例如 3.82/5.0': 'e.g. 3.82/5.0',
    专业排名: 'Class rank',
    '例如 专业前5%': 'e.g. Top 5% of class',
    相关课程: 'Relevant coursework',
    公司名称: 'Company',
    职位: 'Role',
    工作内容与成果: 'Responsibilities and achievements',
    每行一条经历: 'One bullet point per line',
    '每行生成一个项目符号。不填写没有依据的数据。':
      'Each line becomes a bullet point. Include only substantiated figures.',
    项目名称: 'Project name',
    '奖项 / 补充说明': 'Award / Additional details',
    可选: 'Optional',
    项目内容: 'Project details',
    每行一条项目描述: 'One project bullet point per line',
    '模拟经营结果请保留“模拟”说明。': 'Keep the simulation label on simulated business results.',
    技能类别: 'Skill category',
    '例如 AI 内容创作': 'e.g. AI content creation',
    技能描述: 'Skill description',
    '＋ 添加教育经历': '+ Add education',
    '＋ 添加工作经历': '+ Add experience',
    '＋ 添加技能': '+ Add skill',
    '＋ 添加项目': '+ Add project',
    搜索中文或英文术语: 'Search Chinese or English terms',
    搜索专业术语: 'Search professional vocabulary',
    编辑后自动保存: 'Changes are saved automatically',
    '下一步：教育背景 →': 'Next: Education →',
    '下一步：工作经历 →': 'Next: Experience →',
    '下一步：项目经历 →': 'Next: Projects →',
    '下一步：专业技能 →': 'Next: Skills →',
    '下一步：纸面设计 →': 'Next: Paper design →',
    '英文简历还没有内容，本次只切换界面语言。':
      'The English resume has no content, so only the interface language switched.',
    '中文简历还没有内容，本次只切换界面语言。':
      'The Chinese resume has no content, so only the interface language switched.',
    简历照片: 'Resume photo',
    当前简历照片: 'Current resume photo',
    'JPG、PNG 或 WebP，自动裁切为 4:5。': 'JPG, PNG, or WebP. Automatically cropped to 4:5.',
    替换照片: 'Replace photo',
    上传照片: 'Upload photo',
    移除: 'Remove',
    裁切位置: 'Crop position',
    居中: 'Center',
    靠上: 'Top',
    靠下: 'Bottom',
    选择纸面模板: 'Choose a paper template',
    '4 种版式 · 中英通用': '4 layouts · Chinese and English',
    经典单栏: 'Classic single column',
    海外简洁: 'Essential',
    现代侧栏: 'Modern sidebar',
    编辑式: 'Editorial',
    '居中抬头与清晰分节，保留熟悉的简历版式。':
      'A centered header and clearly divided sections in a familiar layout.',
    '左对齐抬头、细线分节，适合突出经历与成果。':
      'A left-aligned header and fine rules emphasize experience and results.',
    '教育与技能放在侧栏，工作和项目形成主线。':
      'Education and skills in a sidebar, with experience and projects in the main column.',
    '衬线字体与色条标题，适合内容、品牌及创意岗位。':
      'Serif type and accent headings for content, branding, and creative roles.',
    '选择模板会应用配套字体与留白；正文和照片文件保留，可继续微调。侧栏版适合视觉展示，岗位要求单栏时可选“海外简洁”。':
      'A template applies matching fonts and spacing while preserving your content and photo. You can refine it further. The sidebar is designed for visual presentation; choose Essential when a single column is required.',
    主题与照片: 'Color and photo',
    '正文保持深色，重点更清楚': 'Dark body text keeps the content readable',
    主题色: 'Accent color',
    墨黑: 'Ink black',
    海军蓝: 'Navy',
    松石绿: 'Teal',
    暖棕: 'Warm brown',
    烟紫: 'Muted purple',
    酒红: 'Burgundy',
    自选: 'Custom',
    自定义主题色: 'Custom accent color',
    在简历中显示照片: 'Show photo on resume',
    '按目标岗位要求选择，隐藏时保留原图。':
      'Choose based on the role requirements. Hiding the photo preserves the original.',
    字体与留白: 'Typography and spacing',
    应用到当前简历的中英文版: 'Applies to both languages of this resume',
    中文字体: 'Chinese font',
    英文字体: 'English font',
    正文字号: 'Body font size',
    姓名字号: 'Name font size',
    正文行距: 'Line spacing',
    页边距: 'Page margins',
    恢复经典单栏设置: 'Reset to Classic settings',
    自动铺满一页: 'Fill one page',
    '自动调整间距，保持字号不变；超过一页时保留原有分页。':
      'Adjust spacing while keeping font sizes unchanged. Resumes longer than one page keep their current pagination.',
    已铺满一页: 'Spacing adjusted to fill one page.',
    已使用最大舒适间距: 'Maximum comfortable spacing applied.',
    '内容超过一页，保持原间距': 'Content exceeds one page. Existing spacing is unchanged.',
    '预览依赖本机字体。PDF 导出保留浏览器实际渲染的字形；Word 文件可继续编辑。':
      'The preview uses fonts installed on this computer. PDF export preserves the rendered appearance; editable Word remains available.',
    '照片已同步到所有简历。': 'Photo synced to all resumes.',
    '无法解码图片，请使用 JPG、PNG 或 WebP。': 'Unable to read the image. Use JPG, PNG, or WebP.',
    '请使用 JPG、PNG 或 WebP。': 'Use JPG, PNG, or WebP.',
    '照片请小于 10 MB。': 'The photo must be smaller than 10 MB.',
    '点击卡片预览右侧内容，需要修改时点「修改」。':
      'Select a card to preview it. Choose Edit to make changes.',
    '＋ 新建简历': '+ New resume',
    '还没有简历，点击「新建简历」开始。': 'No resumes yet. Choose New resume to get started.',
    '每个版本独立保存；点击卡片只预览，点「修改」进入编辑。切换版本前，当前修改会自动保存。':
      'Each resume is saved separately. Select a card to preview, or choose Edit to make changes. Current edits are saved before switching.',
    修改: 'Edit',
    删除简历: 'Delete resume',
    当前编辑: 'Editing',
    预览中: 'Previewing',
    '删除这份简历？': 'Delete this resume?',
    '删除后无法恢复；建议先在当前简历里导出 JSON 备份。':
      'This cannot be undone. Export a JSON backup of this resume first if needed.',
    取消: 'Cancel',
    删除: 'Delete',
    '至少保留一份简历。': 'Keep at least one resume.',
    '已新建简历；修改求职意向和期望薪资后，名称会自动更新。':
      'Resume created. Its name updates automatically when you change the target role and expected salary.',
    '已删除简历。': 'Resume deleted.',
    本机版本记录: 'Local version history',
    '版本只保存在当前浏览器，导出 JSON 可以跨设备继续编辑。':
      'Versions are stored in this browser. Export JSON to continue editing on another device.',
    保存当前版本: 'Save current version',
    恢复: 'Restore',
    '还没有手动保存的版本。': 'No manually saved versions yet.',
    关闭: 'Close',
    '当前版本已保存。': 'Current version saved.',
    '已恢复版本。': 'Version restored.',
    '版本存储空间不足，请保存 JSON 数据。':
      'Not enough storage for another version. Export your JSON data.',
    核对导入内容: 'Review imported content',
    '已提取文本。可以使用识别出的结构化草稿，请对照原文检查。':
      'Text extracted. You can import the structured draft after checking it against the original.',
    '已提取文本。原文件未能可靠识别为分区，将保留为一条待整理项目。':
      'Text extracted. Sections could not be identified reliably; the text will be kept as a project for you to organize.',
    导入原文: 'Original imported text',
    导入识别草稿: 'Import structured draft',
    保留文本并导入: 'Import and preserve text',
    '已导入，请检查分区、日期和内容。': 'Imported. Check the sections, dates, and content.',
    '双语数据已导入。': 'Bilingual data imported.',
    '文件没有可导入的内容。': 'The file contains no importable content.',
    '正在读取文件…': 'Reading file…',
    文件格式不支持: 'Unsupported file format',
    导出提示: 'Export notice',
    '已保存完整双语数据与排版设置。': 'Both languages and layout settings saved.',
    'Word 已生成（与预览一致）。': 'Word generated with the preview appearance.',
    '可编辑 Word 已生成（排版近似）。': 'Editable Word generated with approximate layout.',
    'PDF 已生成（与预览一致）。': 'PDF generated with the preview appearance.',
    '请在打印窗口选择“另存为 PDF”；文字可复制、搜索。':
      'Choose Save as PDF in the print dialog. The text will be selectable and searchable.',
    '正在生成图片…': 'Generating image…',
    '图片已生成。': 'Image generated.',
    请重试: 'Please try again',
    '导出时有内容需检查。': 'Some exported content needs review.',
    '已载入 5 个虚构岗位演示。人物、机构、经历与数据均为示例。':
      'Loaded 5 fictional role demos. All people, organizations, experience, and figures are examples.',
    '从一份材料，到多版简历': 'One set of experience, multiple resumes',
    '导入 Word、JSON 或文本。Word 导入后需核对识别结果。':
      'Import Word, JSON, or text. Check the recognized content after a Word import.',
    '按模块编辑内容，分别完善中文与英文版本。':
      'Edit each section and maintain the Chinese and English resumes separately.',
    '在“纸面设计”切换模板、主题色和照片显示，再调整字体与留白。':
      'In Paper design, choose a template, accent color, and photo visibility, then refine typography and spacing.',
    '点击右上角「下载」，可选择与预览一致的 Word/PDF、可编辑 Word、图片或 JSON。':
      'Use Download at the top right for Word/PDF matching the preview, editable Word, an image, or JSON.',
    'PDF（图片版）直接生成；PDF（文字版）在打印窗口另存，文字可复制/搜索；可编辑 Word 排版为近似值；JSON 可完整保留双语内容和版式。':
      'Image-based PDF downloads directly. Save a selectable-text PDF through the print dialog. Editable Word uses approximate layout. JSON preserves both resume languages and the design settings.',
    '岗位词库来自公开招聘摘录，不代表你已具备所有技能。':
      'The vocabulary comes from public job descriptions and does not imply you have those skills.',
    知道了: 'Got it',
    有经历依据: 'Supported by experience',
    待补充依据: 'Needs confirmation',
    复制词汇: 'Copy term',
    '没有匹配的词汇。': 'No matching terms.',
    '已复制，请结合真实经历使用。': 'Copied. Use it only when it reflects your experience.',
    '当前浏览器不允许复制，请手动选取词汇。':
      'Clipboard access is unavailable. Select and copy the term manually.',
    '通用岗位词汇示例，不代表当前使用者具备该经历；请根据本人真实材料确认后使用。':
      'General role vocabulary, not a claim about your experience. Confirm it matches your own work before using it.',
    产品刊登与上架: 'Product listing',
    'Listing 创建与优化': 'Listing creation and optimization',
    关键词优化: 'Keyword optimization',
    五点描述: 'Product bullet points',
    '亚马逊 A+ 页面': 'Amazon A+ Content',
    市场调研: 'Market research',
    竞品分析: 'Competitor analysis',
    用户反馈收集与整理: 'User feedback collection and synthesis',
    英文文案撰写: 'English copywriting',
    推广素材制作: 'Promotional content production',
    选品与采购支持: 'Product sourcing and procurement support',
    供应商报价对比: 'Supplier quotation comparison',
    样品比对: 'Product sample comparison',
    'AI 图像生成': 'AI image generation',
    商品视频制作: 'Product video production',
    '广告成本销售比（ACoS）': 'Advertising Cost of Sales (ACoS)',
    '亚马逊物流（FBA）': 'Fulfillment by Amazon (FBA)',
    产品本地化: 'Product localization',
    '将商品资料录入平台并发布为可销售商品。简历可写具体的上架执行工作。':
      'Enter product information into a platform and publish sellable listings. Describe the listing tasks you actually performed.',
    '创建、维护商品详情信息，并改进标题、描述、图片或关键词等已实际负责的部分。':
      'Create and maintain product details, improving the titles, descriptions, images, or keywords you were responsible for.',
    '调整商品页面关键词，帮助准确表达产品属性并匹配相关搜索。不要由此推导已做广告关键词投放。':
      'Refine listing keywords to describe product attributes and relevant searches. This does not imply paid keyword advertising experience.',
    '亚马逊商品页面以要点形式呈现的核心功能、卖点与信息。英文宜用 bullet points。':
      'Bullet points on an Amazon listing summarize core features, benefits, and product information.',
    '亚马逊商品展示中的增强图文内容。简历可写页面设计、图文排版与视觉优化。':
      'Enhanced visual and text content on Amazon product pages. Describe the page design, layout, or visual improvements you made.',
    '收集目标市场需求、市场趋势及相关产品信息，为判断产品方向提供资料。':
      'Collect target-market needs, trends, and product information to inform product direction.',
    '比较同类产品的功能、定位、卖点或其他实际调研维度。不要补写未提供的方法、工具或报告数量。':
      'Compare similar products by features, positioning, selling points, or other researched dimensions. Do not add unconfirmed methods, tools, or report counts.',
    '收集使用者意见并归纳需求与问题，为产品优化提供参考。':
      'Collect user feedback and synthesize needs and issues to inform product improvements.',
    '撰写面向英文读者的商品或推广文字；使用 AI 时可表述为辅助撰写，保留人工核对。':
      'Write product or promotional copy for English-speaking readers. Describe AI as an assistant where applicable and retain human review.',
    '整合图片、文字与产品信息形成展示或推广素材，具体形式应对应实际产出。':
      'Combine images, copy, and product information into presentation or promotional materials. Name the formats you actually produced.',
    '调研适合目标市场的商品并为采购选择提供辅助资料。支持工作不等于独立负责采购全流程。':
      'Research products for a target market and support procurement decisions. Support work does not imply ownership of the entire procurement process.',
    '比较供应商报价以支持选品或采购判断。不要由比价扩写为供应商开发、商务谈判或合同签订。':
      'Compare supplier quotations to support sourcing or purchasing decisions. Do not infer supplier development, negotiation, or contracting.',
    '比较候选产品样品并支持最终产品选择。未确认测试标准时不写质量认证或独立品控。':
      'Compare candidate samples to support product selection. Do not claim quality certification or independent quality control without confirmed standards.',
    '通过生成式 AI 制作商品图、模特展示图或使用场景图。可列具体使用工具，但不推导模型训练经验。':
      'Use generative AI for product, model, or lifestyle images. List the tools used without implying model-training experience.',
    '制作展示商品信息或使用方式的视频；可分别标注 AI 生成与常规剪辑。不得补写发布量、播放量或转化效果。':
      'Produce videos showing product information or use. Distinguish AI generation from conventional editing; do not add unconfirmed publishing, view, or conversion figures.',
    '广告支出与广告归因销售额的比值。它是广告效果指标；仅了解定义不能写为具备投放或优化经验。':
      'Advertising spend divided by attributed sales. Knowing this metric alone does not establish campaign management or optimization experience.',
    '由亚马逊提供仓储、拣货配送等履约服务的模式。产品上架经历不自动代表 FBA 备货或库存管理经验。':
      'Amazon provides storage, picking, and delivery services. Product listing experience does not automatically include FBA replenishment or inventory management.',
    '针对目标市场适配语言、文化或产品呈现等内容。跨文化沟通、英文写作不自动等于负责完整本地化流程。':
      'Adapt language, cultural references, or product presentation to a market. Cross-cultural communication and English writing do not imply ownership of a complete localization process.',
    '图片生成失败，请改用可编辑 Word。': 'Image generation failed. Try editable Word.',
    '图片渲染失败，请改用可编辑 Word。': 'Image rendering failed. Try editable Word.',
    '照片无法解码，请重新上传。': 'The photo could not be decoded. Upload it again.',
    '图片无法解码，请重新上传。': 'The image could not be decoded. Upload it again.',
    '当前环境无法转换 WebP 照片，请改用 JPEG 或 PNG。':
      'WebP conversion is unavailable. Use JPEG or PNG.',
    '当前浏览器无法转换 WebP 照片，请改用 JPEG 或 PNG。':
      'WebP conversion is unavailable in this browser. Use JPEG or PNG.',
    'Word 导出组件未载入，请刷新页面后再试。':
      'The Word export component did not load. Refresh and try again.',
    'Word 正文解压后过大，请拆分文档。':
      'The extracted Word content is too large. Split the document.',
    '不支持含外部实体定义的 XML。': 'XML containing external entity definitions is not supported.',
    'Word XML 格式损坏。': 'The Word document contains invalid XML.',
    'Word 已按分区识别为草稿；请逐项核对职位、日期、课程、项目及联系方式。全部提取原文也已保留供检查。':
      'A draft was recognized by section. Check roles, dates, coursework, projects, and contact details. The complete extracted text is preserved for review.',
    'Word 导入仅替换识别语言的内容；另一语言保留原数据，不会自动翻译。原文件的字体、图像与排版未导入。':
      'Word import replaces only the detected resume language. The other language is preserved without automatic translation. Original fonts, images, and layout are not imported.',
    '请选择一个本地文件。': 'Choose a local file.',
    '文件不能超过 10 MB。': 'The file must not exceed 10 MB.',
    'Word 导入组件未载入，请刷新页面后重试。':
      'The Word import component did not load. Refresh and try again.',
    'Word 文件包含过多条目，请使用简化后的 .docx。':
      'The Word document contains too many entries. Use a simplified .docx file.',
    '该文件不是有效的 Word .docx 文档。': 'This is not a valid Word .docx document.',
    'Word 提取正文超过 20 万字，请拆分文档。':
      'The extracted Word text exceeds 200,000 characters. Split the document.',
    '未读取到可编辑正文，图片扫描件请先转成文字。':
      'No editable text was found. Convert scanned images to text first.',
    '未能可靠识别简历分区，已保留全部正文。请从下方原文复制到对应字段，当前简历未被替换。':
      'Resume sections could not be identified reliably. All text is preserved below for you to copy into the appropriate fields. The current resume is unchanged.',
    '文件包含图像或文本框，请对照原 Word 检查文字是否完整。':
      'The file contains images or text boxes. Compare it with the original Word document to check completeness.',
    '已读取文字。请核对后复制到对应字段；当前简历保持不变。':
      'Text read. Review it and copy it into the appropriate fields. The current resume is unchanged.',
    '文本预览最多保留 20 万字。': 'The text preview is limited to 200,000 characters.',
    '当前支持 JSON、Word (.docx)、TXT 和 Markdown 导入。PDF 请先转换为可编辑 Word 或文字。':
      'Import JSON, Word (.docx), TXT, or Markdown. Convert PDFs to editable Word or text first.',
    '不支持此格式。请选择 JSON、Word (.docx)、TXT 或 Markdown 文件。':
      'Unsupported format. Choose JSON, Word (.docx), TXT, or Markdown.',
    '无法读取此文件。': 'Unable to read this file.',
    'PDF 导出组件未载入，请刷新页面后再试。':
      'The PDF export component did not load. Refresh and try again.',
  }),
);

const protectedSelector = [
  '#resume-preview',
  '#print-root',
  'script',
  'style',
  '#document-title',
  '.resume-card-name',
  '.version-row strong',
  '#ui-language-btn',
  '.lang-option',
  '[data-interface-content="preserve"]',
].join(',');
const attributes = ['placeholder', 'title', 'aria-label', 'alt'];

// Regexes are limited to UI status locations; user-entered text is never matched.
export function translateInterfaceText(source, context = '') {
  if (typeof source !== 'string') return source;
  const match = source.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const [, before, text, after] = match;
  let translated = english.get(text);
  if (translated === undefined && context === 'entry' && /^条目 \d+$/.test(text))
    translated = text.replace(/^条目 /, 'Entry ');
  if (translated === undefined && context === 'page' && /^约 \d+ 页$/.test(text))
    translated = text.replace(/^约 (\d+) 页$/, 'About $1 pages');
  if (translated === undefined && context === 'spacing' && /^\d+(?:\.\d+)? 倍$/.test(text))
    translated = text.replace(/ 倍$/, '×');
  if (translated === undefined && context === 'card-meta') {
    const m = text.match(
      /^(中文|English) · 更新于 (\d{2}\/\d{2} \d{2}:\d{2}|\d{2}\/\d{2} \d{1,2}:\d{2}|\d{2}-\d{2} \d{2}:\d{2})( ·)?$/,
    );
    if (m) translated = `${m[1] === '中文' ? 'Chinese' : 'English'} · Updated ${m[2]}${m[3] || ''}`;
  }
  if (translated === undefined && context === 'toast') {
    const prefixes = [
      ['已进入修改：', 'Editing: '],
      ['导入失败：', 'Import failed: '],
      ['导入未完成：', 'Import incomplete: '],
      ['导出失败：', 'Export failed: '],
      ['导出完成，但注意：', 'Exported with a notice: '],
      ['照片未加入 Word：', 'Photo not included in Word: '],
    ];
    for (const [prefix, replacement] of prefixes) {
      if (!text.startsWith(prefix)) continue;
      const rest = text.slice(prefix.length);
      // File names after “Editing:” are user data, even when they match a UI label.
      translated = replacement + (prefix === '已进入修改：' ? rest : translateNotice(rest));
      break;
    }
    if (translated === undefined && text.includes('；')) translated = translateNotice(text);
  }
  return translated === undefined ? source : before + translated + after;
}

function translateNotice(text) {
  return text
    .split('；')
    .map((part) => english.get(part) || part)
    .join('; ');
}

let activeController;

export function initInterfaceLanguage() {
  if (typeof document === 'undefined' || !document.body) return null;
  if (activeController) return activeController;
  const textSources = new WeakMap();
  const attributeSources = new WeakMap();
  let language = 'en';
  try {
    language = localStorage.getItem(INTERFACE_STORAGE_KEY) === 'en' ? 'en' : 'zh';
  } catch {
    /* The editor also works when storage is unavailable. */
  }

  function isProtected(element) {
    if (!element || element.closest(protectedSelector)) return true;
    // The delete dialog includes the current resume's title as a plain paragraph.
    const dialog = element.closest('.modal-content');
    if (dialog?.querySelector('#confirm-delete-resume')) {
      const title = dialog.querySelector('p');
      if (title && (element === title || title.contains(element))) return true;
    }
    return false;
  }
  function contextFor(element) {
    if (element.closest('#toast')) return 'toast';
    if (element.closest('#page-status')) return 'page';
    if (element.closest('#value-lineHeight')) return 'spacing';
    if (element.closest('.entry-tools strong')) return 'entry';
    if (element.closest('.resume-card-meta')) return 'card-meta';
    return '';
  }
  function updateText(node) {
    const parent = node.parentElement;
    if (isProtected(parent) || parent.closest('textarea')) return;
    const previous = textSources.get(node);
    const source = previous && node.data === previous.rendered ? previous.source : node.data;
    const rendered =
      language === 'en' ? translateInterfaceText(source, contextFor(parent)) : source;
    textSources.set(node, { source, rendered });
    if (node.data !== rendered) node.data = rendered;
  }
  function updateAttributes(element) {
    if (isProtected(element)) return;
    let records = attributeSources.get(element);
    if (!records) {
      records = new Map();
      attributeSources.set(element, records);
    }
    for (const name of attributes) {
      if (!element.hasAttribute(name)) continue;
      const value = element.getAttribute(name);
      const previous = records.get(name);
      const source = previous && value === previous.rendered ? previous.source : value;
      const rendered = language === 'en' ? translateInterfaceText(source) : source;
      records.set(name, { source, rendered });
      if (value !== rendered) element.setAttribute(name, rendered);
    }
  }
  function translateSubtree(root) {
    if (root.nodeType === 3) {
      updateText(root);
      return;
    }
    if (root.nodeType !== 1 || isProtected(root)) return;
    updateAttributes(root);
    root.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(updateAttributes);
    const walker = document.createTreeWalker(root, 4);
    while (walker.nextNode()) updateText(walker.currentNode);
  }
  const observer = new MutationObserver((mutations) => {
    const roots = new Set();
    for (const mutation of mutations) {
      if (mutation.type === 'childList') mutation.addedNodes.forEach((node) => roots.add(node));
      else roots.add(mutation.target);
    }
    observer.disconnect();
    try {
      roots.forEach(translateSubtree);
    } finally {
      observe();
    }
  });
  function observe() {
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: attributes,
    });
  }
  function updateButton() {
    const button = document.getElementById('ui-language-btn');
    if (!button) return;
    button.textContent = language === 'en' ? '中文' : 'English';
    button.title =
      language === 'en' ? 'Switch interface language to Chinese' : '切换界面语言为英文';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('lang', language === 'en' ? 'zh-CN' : 'en');
  }
  function setLanguage(next) {
    language = next === 'en' ? 'en' : 'zh';
    observer.disconnect();
    try {
      document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
      translateSubtree(document.body);
      updateButton();
      try {
        localStorage.setItem(INTERFACE_STORAGE_KEY, language);
      } catch {
        /* Optional preference. */
      }
    } finally {
      observe();
    }
  }
  const button = document.getElementById('ui-language-btn');
  const onToggle = () => setLanguage(language === 'en' ? 'zh' : 'en');
  button?.addEventListener('click', onToggle);
  activeController = {
    get language() {
      return language;
    },
    setLanguage,
    dispose() {
      observer.disconnect();
      button?.removeEventListener('click', onToggle);
      activeController = undefined;
    },
  };
  setLanguage(language);
  return activeController;
}
