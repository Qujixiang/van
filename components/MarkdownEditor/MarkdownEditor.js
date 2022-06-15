import { marked, cleanUrl } from './libs/marked/marked.js';
import hljs from './libs/highlight/highlight.min.js';
import shortcut from './libs/shortcut/shortcut.js';

const baseDir = '/components/MarkdownEditor';
const baseImgsDir = baseDir + '/res/imgs';

class MarkdownEditor {
  /**
   * 存储imageURL到{blobURL, existed}的映射，imageURL为图片的URL，blobURL为blob格式图片的URL，existed表示imageURL是否存在于localImageURLMap中
   *   1. 用户选择本地图片
   *     1.1 若imageURL在localImageURLMap中，则直接获取blobURL
   *     1.2 若imageURL不在localImageURLMap中，则创建blobURL，并将blobURL存到localImageURLMap中
   *   2. 解析markdown图片
   *     2.1 若imageURL以/imgs/开头，且imageURL在localImageURLMap中，则直接获取blobURL
   *     2.2 若imageURL以/imgs/开头，且imageURL不在localImageURLMap中，则不做处理，说明图片存储在服务端
   *     2.3 若imageURL不以/imgs/开头，则不做处理，说明图片存储在其它网站的服务端
   */
  static localImageURLMap = new Map();

  static htmlFragment = `
<div class="markdown-container">
  <!-- 工具栏 -->
  <div class="markdown-toolbar">
    <!-- 工具栏左侧工具 -->
    <img src="${baseImgsDir}/font-size.svg" alt="字体大小" title="字体大小"
      class="markdown-tool-button markdown-font-size-button">
    <img src="${baseImgsDir}/bold.svg" alt="粗体" title="粗体"
      class="markdown-tool-button markdown-bold-button">
    <img src="${baseImgsDir}/italic.svg" alt="斜体" title="斜体"
      class="markdown-tool-button markdown-italic-button">
    <img src="${baseImgsDir}/strikethrough.svg" alt="删除线" title="删除线"
      class="markdown-tool-button markdown-strikethrough-button">
    <img src="${baseImgsDir}/image.svg" alt="插入图片" title="插入图片"
    class="markdown-tool-button markdown-select-image-button">
    <img src="${baseImgsDir}/table.svg" alt="表格" title="表格"
      class="markdown-tool-button markdown-table-button">
    <img src="${baseImgsDir}/list.svg" alt="列表" title="列表"
      class="markdown-tool-button markdown-list-button">
    <img src="${baseImgsDir}/code.svg" alt="代码" title="代码"
      class="markdown-tool-button markdown-code-button">
    <img src="${baseImgsDir}/link.svg" alt="链接" title="链接"
      class="markdown-tool-button markdown-link-button">
    <img src="${baseImgsDir}/rotate-left.svg" alt="撤销" title="撤销"
      class="markdown-tool-button markdown-undo-button">
    <img src="${baseImgsDir}/rotate-right.svg" alt="重做" title="重做"
      class="markdown-tool-button markdown-redo-button">
    <img src="${baseImgsDir}/save.svg" alt="保存草稿" title="保存草稿"
      class="markdown-tool-button markdown-save-draft-button">
    <img src="${baseImgsDir}/upload.svg" alt="上传" title="上传"
      class="markdown-tool-button markdown-upload-button">
    <img src="${baseImgsDir}/trash.svg" alt="清空" title="清空"
      class="markdown-tool-button markdown-clear-button">
    <!-- 工具栏右侧工具 -->
    <img src="${baseImgsDir}/eye.svg" alt="预览" title="预览"
      class="markdown-tool-button markdown-preview-button">
    <img src="${baseImgsDir}/maximize.svg" alt="宽屏" title="宽屏"
      class="markdown-tool-button markdown-maximize-button">
    <img src="${baseImgsDir}/expand.svg" alt="全屏" title="全屏"
      class="markdown-tool-button markdown-fullscreen-button">
  </div>
  <!-- 编辑器 -->
  <textarea class="markdown-editor" wrap="off" spellcheck="false"></textarea>
  <!-- <div class="markdown-editor" contenteditable="true" spellcheck="false"></div> -->
  <!-- 预览器 -->
  <div class="markdown-previewer"></div>
</div>
`;

  static defaultOptions = {
    tableRowCount: 2,
    tableColumnCount: 2,
    previewShortcut: 'ctrl+f9',
    maximizeShortcut: 'ctrl+f10',
    fullscreenShortcut: 'ctrl+f11',
  };
  
  /**
   * 
   * @param {HTMLElement} mountedElement 挂载节点，用于挂载MarkdownEditor
   */
  constructor (mountedElement) {
    const fragment = document.createElement('div');
    fragment.innerHTML = MarkdownEditor.htmlFragment;
    mountedElement.appendChild(fragment.firstElementChild);
    
    this._mountedElement = mountedElement;
    this._containerElement = this._mountedElement.getElementsByClassName('markdown-container')[0]; // 容器
    this._toolbarElement = this._mountedElement.getElementsByClassName('markdown-toolbar')[0]; // 工具栏
    this._editorElement = this._mountedElement.getElementsByClassName('markdown-editor')[0]; // 编辑器
    this._previewerElement = this._mountedElement.getElementsByClassName('markdown-previewer')[0]; // 预览器
    this._fontSizeButton = this._mountedElement.getElementsByClassName('markdown-font-size-button')[0]; // 字体大小按钮
    this._boldButton = this._mountedElement.getElementsByClassName('markdown-bold-button')[0]; // 粗体按钮
    this._italicButton = this._mountedElement.getElementsByClassName('markdown-italic-button')[0]; // 斜体按钮
    this._strikethroughButton = this._mountedElement.getElementsByClassName('markdown-strikethrough-button')[0]; // 删除线按钮
    this._selectLocalImageButton = this._mountedElement.getElementsByClassName('markdown-select-image-button')[0]; // 插入图片按钮
    this._tableButton = this._mountedElement.getElementsByClassName('markdown-table-button')[0]; // 表格按钮
    this._listButton = this._mountedElement.getElementsByClassName('markdown-list-button')[0]; // 列表按钮
    this._codeButton = this._mountedElement.getElementsByClassName('markdown-code-button')[0]; // 代码按钮
    this._linkButton = this._mountedElement.getElementsByClassName('markdown-link-button')[0]; // 链接按钮
    this._undoButton = this._mountedElement.getElementsByClassName('markdown-undo-button')[0]; // 撤销按钮
    this._redoButton = this._mountedElement.getElementsByClassName('markdown-redo-button')[0]; // 重做按钮
    this._saveDraftButton = this._mountedElement.getElementsByClassName('markdown-save-draft-button')[0]; // 保存草稿按钮
    this._uploadButton = this._mountedElement.getElementsByClassName('markdown-upload-button')[0]; // 上传按钮
    this._clearButton = this._mountedElement.getElementsByClassName('markdown-clear-button')[0]; // 清空按钮
    this._previewButton = this._mountedElement.getElementsByClassName('markdown-preview-button')[0]; // 预览按钮
    this._maximizeButton = this._mountedElement.getElementsByClassName('markdown-maximize-button')[0]; // 宽屏按钮
    this._fullscreenButton = this._mountedElement.getElementsByClassName('markdown-fullscreen-button')[0]; // 全屏按钮
    this._imageInputElement = document.createElement('input');  // 选择图片控件（不可见）
    this._imageInputElement.type = 'file';
    this._imageInputElement.accept = 'image/*';

    this._editorScrollingFlag = false;
    this._previewerScrollingFlag = false;
    this._previewFlag = true;
    this._maximizeFlag = false;
    this._fullscreenFlag = false;

    this._initMarkdownParser();
    this._initListener();
    this._initFullscreenListener();
    this._initShortcuts();
    this._restoreDraft();
  }

  /**
   * 获取指定元素中的选区起点和终点
   * @param {HTMLTextAreaElement} 元素
   * @returns {Object}
   */
   getSelectionRange() {
    return {
      start: this._editorElement.selectionStart,
      end: this._editorElement.selectionEnd
    }
  }

  /**
   * 将[start, end)区域内的旧文本替换为text文本
   * @param {number} start 起点
   * @param {number} end 终点
   * @param {string} text 文本
   */
  setRangeText(start, end, text) {
    if (document.execCommand) {
      this._editorElement.focus();
      document.execCommand('insertText', false, text);
    }
    else this._editorElement.setRangeText(text, start, end);
  }

  /**
   * 选中[start, end)区域
   * @param {number} start 起点
   * @param {number} end 终点
   */
  setSelectionRange(start, end) {
    this._editorElement.setSelectionRange(start, end);
  }

  /**
   * 获取编辑器的文本
   * @returns {string} 编辑器的文本
   */
  getText() {
    return this._editorElement.value;
  }

  /**
   * 设置编辑器中的文本
   * @param {string} text 需要设置的文本
   */
  setText(text) {
    if (document.execCommand) {
      this._editorElement.value = '';
      this._editorElement.focus();
      document.execCommand('insertText', false, text);
    } else {
      this._editorElement.value = text;
      this._editorElement.dispatchEvent(new Event('input'));
    }
  }

  /**
   * 将Markdown文本渲染到预览器上
   * @param {string} markdownText 需要渲染的Markdown格式的文本
   */
  renderText(markdownText) {
    this._previewerElement.innerHTML = marked.parse(markdownText);
  }

  /**
   * 清除编辑器中的文本和预览器中的内容
   */
  clear() {
    this._editorElement.value = '';
    this._previewerElement.innerHTML = '';
  }

  /**
   * 初始化Markdown解析器
   *   1. 处理用户从本地上传的图片
   *   2. 对代码高亮
   */
  _initMarkdownParser() {
    const imageBlobRenderer = { // 解析blob格式图片的渲染器
       image(href, title, text) {
        href = cleanUrl(this.options.sanitize, this.options.baseUrl, href);
        if (href === null) {
          return text;
        }
        href = href.startsWith('/imgs/') && MarkdownEditor.localImageURLMap.has(href) ? MarkdownEditor.localImageURLMap.get(href) : href;
        let out = `<img src="${baseDir}${href}" alt="${text}"`;
        if (title) {
          out += ` title="${title}"`;
        }
        out += this.options.xhtml ? '/>' : '>';
        return out;
      }
    };
    marked.setOptions({
      highlight: function(code, language) {
        const result = hljs.highlight(code, { language, ignoreIllegals: true });
        return result.value;
      }
    });
    marked.use({ renderer: imageBlobRenderer });
  }

  /**
   * 初始化监听器，绑定MarkdownEditor各个控件和相应的事件处理方法
   */
  _initListener() {
    this._editorElement.addEventListener('keydown', this._editorElementListener.bind(this));
    this._editorElement.addEventListener('input', this._editorElementListener.bind(this));
    this._editorElement.addEventListener('scroll', this._editorElementListener.bind(this));
    this._previewerElement.addEventListener('scroll', this._previewerElementListener.bind(this));
    this._fontSizeButton.addEventListener('click', this._fontSizeButtonListener.bind(this));
    this._boldButton.addEventListener('click', this._boldButtonListener.bind(this));
    this._italicButton.addEventListener('click', this._italicButtonListener.bind(this));
    this._strikethroughButton.addEventListener('click', this._strikethroughButtonListener.bind(this));
    this._selectLocalImageButton.addEventListener('click', this._selectLocalImageButtonListener.bind(this));
    this._imageInputElement.addEventListener('change', this._imageInputElementListener.bind(this));
    this._tableButton.addEventListener('click', this._tableButtonListener.bind(this));
    this._listButton.addEventListener('click', this._listButtonListener.bind(this));
    this._codeButton.addEventListener('click', this._codeButtonListener.bind(this));
    this._linkButton.addEventListener('click', this._linkButtonListener.bind(this));
    this._undoButton.addEventListener('click', this._undoButtonListener.bind(this));
    this._redoButton.addEventListener('click', this._redoButtonListener.bind(this));
    this._saveDraftButton.addEventListener('click', this._saveDraftButtonListener.bind(this));
    this._clearButton.addEventListener('click', this._clearButtonListener.bind(this));
    this._previewButton.addEventListener('click', this._previewButtonListener.bind(this));
    this._maximizeButton.addEventListener('click', this._maximizeButtonListener.bind(this));
    this._fullscreenButton.addEventListener('click', this._fullscreenButtonListener.bind(this));

  }

  /**
   * 全屏和退出全屏事件处理方法
   */
  _initFullscreenListener() {
    document.addEventListener('fullscreenchange', event => {
      if (document.fullscreenElement === this._containerElement) {
        this._fullscreenButton.setAttribute('src', `${baseImgsDir}/narrow.svg`);
        this._fullscreenButton.setAttribute('title', '退出全屏');
        this._fullscreenButton.setAttribute('alt', '退出全屏');
        this._fullscreenFlag = true;
      } else {
        this._fullscreenButton.setAttribute('src', `${baseImgsDir}/expand.svg`);
        this._fullscreenButton.setAttribute('title', '全屏');
        this._fullscreenButton.setAttribute('alt', '全屏');
        this._fullscreenFlag = false;
      }
    })
  }

  /**
   * 注册快捷键
   */
  _initShortcuts() {
    shortcut.add(MarkdownEditor.defaultOptions.previewShortcut, e => this._previewButton.click());
    shortcut.add(MarkdownEditor.defaultOptions.maximizeShortcut, e => this._maximizeButton.click());
    shortcut.add(MarkdownEditor.defaultOptions.fullscreenShortcut, e => this._fullscreenButton.click());
  }

  /**
   * 编辑器的监听器
   * @param {InputEvent | Event} event input或scroll事件
   */
  _editorElementListener(event) {
    if (event.type === 'input') {
      const markdownText = this.getText();
      this.renderText(markdownText);
    } else if (event.type === 'scroll') {
      if (this._previewerScrollingFlag) {
        this._previewerScrollingFlag = false;
        return;
      }
      this._editorScrollingFlag = true;
      this._previewerElement.scrollTop = this._editorElement.scrollTop / this._editorElement.scrollHeight * this._previewerElement.scrollHeight;
    }
  }

  /**
   * 预览器的监听器
   * @param {Event} event scroll事件
   */
  _previewerElementListener(event) {
    if (event.type === 'scroll') {
      if (this._editorScrollingFlag) {
        this._editorScrollingFlag = false;
        return;
      }
      this._previewerScrollingFlag = true;
      this._editorElement.scrollTop = this._previewerElement.scrollTop / this._previewerElement.scrollHeight * this._editorElement.scrollHeight;
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
  _fontSizeButtonListener(event) {
    if (event.type === 'click') {
      const fontSize = parseInt(prompt('字体大小:', '16')) || 16;
      this._editorElement.style.fontSize = this._previewerElement.style.fontSize = `${fontSize}px`;
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
  _boldButtonListener(event) {
    if (event.type === 'click') {
      const {start, end} = this.getSelectionRange();
      const markdownText = '****';
      this.setRangeText(start, end, markdownText);
      this.setSelectionRange(start + 2, start + 2);
      this._editorElement.dispatchEvent(new Event('input'));
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
  _italicButtonListener(event) {
    if (event.type === 'click') {
      const {start, end} = this.getSelectionRange();
      const markdownText = '**';
      this.setRangeText(start, end, markdownText);
      this.setSelectionRange(start + 1, start + 1);
      this._editorElement.dispatchEvent(new Event('input'));
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
   _strikethroughButtonListener(event) {
    if (event.type === 'click') {
      const {start, end} = this.getSelectionRange();
      const markdownText = '~~';
      this.setRangeText(start, end, markdownText);
      this.setSelectionRange(start + 1, start + 1);
      this._editorElement.dispatchEvent(new Event('input'));
    }
  }

  /**
   * 
   * @param {Event} event change事件
   */
  _imageInputElementListener(event) {
    if (event.type === 'change') {
      if (this._imageInputElement.files.length === 0) return;
      const imageFile = this._imageInputElement.files.item(0);
      const imageURL = `/imgs/${imageFile.name}`;
      if (!MarkdownEditor.localImageURLMap.has(imageURL)) {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          const blobURL = reader.result;
          MarkdownEditor.localImageURLMap.set(imageURL, blobURL);
          const imageName = imageFile.name;
          const {start, end} = this.getSelectionRange();
          const imageMarkdownURL = `![${imageName}](/imgs/${imageName})`; // 在Markdown编辑器中的图片URL
          this._editorElement.setRangeText(imageMarkdownURL, start, end);
          this._editorElement.dispatchEvent(new Event('input'));
        });
        reader.readAsDataURL(imageFile);
      }
      else {
        const imageName = imageFile.name;
        const {start, end} = this.getSelectionRange();
        const imageMarkdownURL = `![${imageName}](/imgs/${imageName})`; // 在Markdown编辑器中的图片URL
        this._editorElement.setRangeText(imageMarkdownURL, start, end);
        this._editorElement.dispatchEvent(new Event('input'));
      }
      event.target.value = null; // 清空用户的选择，否则不会触发change事件，即不能重复选择上次选择的文件
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
   _selectLocalImageButtonListener(event) {
    if (event.type === 'click') {
      this._imageInputElement.click();
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
  _tableButtonListener(event) {
    if (event.type === 'click') {
      const {start, end} = this.getSelectionRange();
      const rowCount = parseInt(prompt('行数:', MarkdownEditor.defaultOptions.tableRowCount));
      const columnCount = parseInt(prompt('列数:', MarkdownEditor.defaultOptions.tableColumnCount));
      if (!rowCount || !columnCount) return;
      const markdownText = `${'|  '.repeat(columnCount)}|
${'|:-:'.repeat(columnCount)}|
${('|  '.repeat(columnCount) + '|\n').repeat(rowCount)}`;
      this.setRangeText(start, end, markdownText);
      this.setSelectionRange(start + 2, start + 2);
      this._editorElement.dispatchEvent(new Event('input'));
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
  _listButtonListener(event) {
    if (event.type === 'click') {
      const {start, end} = this.getSelectionRange();
      const markdownText = '- ';
      this.setRangeText(start, end, markdownText);
      this.setSelectionRange(start + 2, start + 2);
      this._editorElement.dispatchEvent(new Event('input'));
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
  _codeButtonListener(event) {
    if (event.type === 'click') {
      const {start, end} = this.getSelectionRange();
      const markdownText = '```\n```';
      this.setRangeText(start, end, markdownText);
      this.setSelectionRange(start + 3, start + 3);
      this._editorElement.dispatchEvent(new Event('input'));
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
   _linkButtonListener(event) {
    if (event.type === 'click') {
      const {start, end} = this.getSelectionRange();
      const markdownText = '[]()';
      this.setRangeText(start, end, markdownText);
      this.setSelectionRange(start + 1, start + 1);
      this._editorElement.dispatchEvent(new Event('input'));
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
  _undoButtonListener(event) {
    if (event.type === 'click') {
      if (document.execCommand) document.execCommand('undo', false);
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
  _redoButtonListener(event) {
    if (event.type === 'click') {
      if (document.execCommand) document.execCommand('redo', false);
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
  _saveDraftButtonListener(event) {
    if (event.type === 'click') {
      localStorage.setItem('draft', this.getText());
      const gallery = {};
      for (const [imageURL, blobURL] of MarkdownEditor.localImageURLMap.entries()) {
        gallery[imageURL] = blobURL;
      }
      localStorage.setItem('gallery', JSON.stringify(gallery));
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
  _clearButtonListener(event) {
    if (event.type === 'click') {
      this.clear();
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
   _previewButtonListener(event) {
    if (event.type === 'click') {
      if(this._previewFlag) {
        this._previewButton.setAttribute('src', `${baseImgsDir}/eye-closed.svg`);
        this._previewerElement.style.display = 'none';
        this._containerElement.style.gridTemplateColumns = '1fr';
      }
      else {
        this._previewButton.setAttribute('src', `${baseImgsDir}/eye.svg`);
        this._previewerElement.style.display = '';
        this._containerElement.style.gridTemplateColumns = '1fr 1fr';
      }
      this._previewFlag = !this._previewFlag;
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
   _maximizeButtonListener(event) {
    if (event.type === 'click') {
      if (!this._maximizeFlag) {
        this._maximizeButton.setAttribute('src', `${baseImgsDir}/minimize.svg`);
        this._maximizeButton.setAttribute('alt', '退出宽屏');
        this._maximizeButton.setAttribute('title', '退出宽屏');
        const bodyWidth = document.documentElement.clientWidth;
        const bodyHeight = document.documentElement.clientHeight;
        this._containerElement.style.position = 'fixed';
        this._containerElement.style.left = 0;
        this._containerElement.style.top = 0;
        this._containerElement.style.width = `${bodyWidth}px`;
        this._containerElement.style.height = `${bodyHeight}px`;
      } else {
        this._maximizeButton.setAttribute('src', `${baseImgsDir}/maximize.svg`);
        this._maximizeButton.setAttribute('alt', '宽屏');
        this._maximizeButton.setAttribute('title', '宽屏');
        this._containerElement.style.position = 'static';
        this._containerElement.style.width = '100%';
        this._containerElement.style.height = '100%';
      }
      this._maximizeFlag = !this._maximizeFlag;
    }
  }

  /**
   * 
   * @param {MouseEvent} event click事件
   */
   _fullscreenButtonListener(event) {
    if (event.type === 'click') {
      if (!this._containerElement.requestFullscreen) {
        alert('浏览器不支持全屏模式');
        return;
      }
      if (!this._fullscreenFlag) {
        this._containerElement.requestFullscreen();
        this._fullscreenButton.setAttribute('src', `${baseImgsDir}/narrow.svg`);
        this._fullscreenButton.setAttribute('title', '退出全屏');
        this._fullscreenButton.setAttribute('alt', '退出全屏');
      }
      else {
        document.exitFullscreen();
        this._fullscreenButton.setAttribute('src', `${baseImgsDir}/expand.svg`);
        this._fullscreenButton.setAttribute('title', '全屏');
        this._fullscreenButton.setAttribute('alt', '全屏');
      }
      this._fullscreenFlag = !this._fullscreenFlag;
    }
  }

  /**
   * 恢复草稿
   */
  _restoreDraft() {
    if (localStorage.getItem('draft')) {
      const gallery = JSON.parse(localStorage.getItem('gallery')); // 获取上次保存的草稿里的图片
      for (const [imageURL, blobURL] of Object.entries(gallery)) {
        MarkdownEditor.localImageURLMap.set(imageURL, blobURL);
      }
      const draft = localStorage.getItem('draft'); // 恢复上次保存的草稿
      this.setText(draft);
      this._editorElement.dispatchEvent(new Event('input')); // 解析markdown
      localStorage.removeItem('gallery');
      localStorage.removeItem('draft'); // 恢复完毕后清空草稿
    }
  }
}

export { MarkdownEditor };