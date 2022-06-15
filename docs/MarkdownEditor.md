# MarkdownEditor

## 用法

引入样式：

```html
<link rel="stylesheet" href="../../components/MarkdownEditor/libs/highlight/atom-one-dark.css">
<link rel="stylesheet" href="../../components/MarkdownEditor/MarkdownEditor.css">
```

引入脚本：

```javascript
import { MarkdownEditor } from "../../components/MarkdownEditor/MarkdownEditor.js";
```

将MarkdownEditor挂载到指定节点里：

```javascript
const markdownEditor = new MarkdownEditor(mountedElement); // mountedElement为HTMLElement类型的挂载节点
```



## 功能

MarkdownEditor支持以下功能：

- 支持基本Markdown语法
- 一键添加Markdown语法
- 支持用户上传本地图片并预览
- 支持宽屏编辑
- 支持全屏编辑
- 支持常见编程语言代码高亮
- 代码为atom-one-dark样式
- 支持在本地浏览器中保存草稿，随写随存，下次使用时自动恢复草稿
- 支持调节字体大小