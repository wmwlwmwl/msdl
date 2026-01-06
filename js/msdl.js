const apiUrl = "https://api.gravesoft.dev/msdl/";

const sessionId = document.getElementById('msdl-session-id');
const msContent = document.getElementById('msdl-ms-content');
const pleaseWait = document.getElementById('msdl-please-wait');
const processingError = document.getElementById('msdl-processing-error');

const productsList = document.getElementById('products-list');
const backToProductsDiv = document.getElementById('back-to-products');

let availableProducts = {};
let skuId = null; // 初始化skuId为null，避免默认值干扰

// 最终完整版语言映射表（包含所有语言）
const languageMap = {
    "Arabic": "阿拉伯语",
    "Brazilian Portuguese": "巴西葡萄牙语",
    "Bulgarian": "保加利亚语",
    "Chinese Simplified": "中文（简体）",
    "Chinese Traditional": "中文（繁体）",
    "Chinese Traditional Hong Kong": "中文（繁体香港）",
    "Croatian": "克罗地亚语",
    "Czech": "捷克语",
    "Danish": "丹麦语",
    "Dutch": "荷兰语",
    "English (United States)": "英语（美国）",
    "English International": "英语（国际）",
    "Estonian": "爱沙尼亚语",
    "Finnish": "芬兰语",
    "French": "法语",
    "French Canadian": "法语（加拿大）",
    "German": "德语",
    "Greek": "希腊语",
    "Hebrew": "希伯来语",
    "Hungarian": "匈牙利语",
    "Italian": "意大利语",
    "Japanese": "日语",
    "Korean": "韩语",
    "Latvian": "拉脱维亚语",
    "Lithuanian": "立陶宛语",
    "Norwegian": "挪威语",
    "Polish": "波兰语",
    "Portuguese": "葡萄牙语",
    "Romanian": "罗马尼亚语",
    "Russian": "俄语",
    "Serbian Latin": "塞尔维亚语（拉丁语）",
    "Slovak": "斯洛伐克语",
    "Slovenian": "斯洛文尼亚语",
    "Spanish": "西班牙语",
    "Spanish (Mexico)": "西班牙语（墨西哥）",
    "Swedish": "瑞典语",
    "Thai": "泰语",
    "Turkish": "土耳其语",
    "Ukrainian": "乌克兰语"
};

function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// 修复：更新选中语言时同步skuId
function updateVars() {
    let id = document.getElementById('product-languages').value;
    if (id === "") {
        document.getElementById('submit-sku').disabled = 1;
        skuId = null;
        return null;
    }

    document.getElementById('submit-sku').disabled = 0;
    const selectedData = JSON.parse(id);
    skuId = selectedData.id; // 关键：将选中的语言ID赋值给skuId
    return selectedData.id;
}

function langJsonStrToHTML(jsonStr) {
    let json = JSON.parse(jsonStr);
    let container = document.createElement('div');

    let header = document.createElement('h2');
    header.textContent = "选择产品语言";
    container.appendChild(header);

    let info = document.createElement('p');
    info.innerHTML = "安装 Windows 时，您需要选择相同的语言。要查看当前使用的语言，请转到<strong>“电脑设置”</strong>中的<strong>“时间和语言”</strong>或<strong>“控制面板”</strong>中的<strong>“区域”</strong>。";
    container.appendChild(info);

    let select = document.createElement('select');
    select.id = "product-languages";

    let defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.selected = "selected";
    defaultOption.textContent = "选择一个";
    select.appendChild(defaultOption);

    let hasChineseSimplified = false;
    json.Skus.forEach(sku => {
        let option = document.createElement('option');
        option.value = JSON.stringify({ id: sku.Id });
        option.textContent = languageMap[sku.LocalizedLanguage] || sku.LocalizedLanguage;

        // 可选：默认选中中文（简体），但不强制赋值skuId（由change事件更新）
        if (sku.LocalizedLanguage === "Chinese Simplified") {
            option.selected = "selected";
            hasChineseSimplified = true;
        }

        select.appendChild(option);
    });

    // 若有中文（简体），初始化时触发一次更新
    if (hasChineseSimplified) {
        setTimeout(() => updateVars(), 0);
    }

    container.appendChild(select);

    let button = document.createElement('button');
    button.id = "submit-sku";
    button.textContent = "提交";
    button.disabled = !hasChineseSimplified; // 有默认选中则启用按钮
    button.setAttribute("onClick", "getDownload();");

    container.appendChild(button);

    return container.innerHTML;
}

function onLanguageXhrChange() {
    if (!(this.status == 200))
        return;

    if (pleaseWait.style.display != "block")
        return;

    pleaseWait.style.display = "none";
    msContent.style.display = "block";

    let langHtml = langJsonStrToHTML(this.responseText);
    msContent.innerHTML = langHtml;

    let submitSku = document.getElementById('submit-sku');
    submitSku.setAttribute("onClick", "getDownload();");

    let prodLang = document.getElementById('product-languages');
    // 绑定change事件，确保切换语言时更新skuId
    prodLang.setAttribute("onChange", "updateVars();");

    // 初始化时更新一次变量
    updateVars();
}

// 修复：强制获取最新选中的skuId，不再依赖旧值
function getDownload() {
    // 先更新最新的选中值
    const latestSkuId = updateVars();
    
    // 未选择语言时提示并终止
    if (!latestSkuId) {
        alert("请先选择有效的语言！");
        return;
    }

    msContent.style.display = "none";
    pleaseWait.style.display = "block";

    let url = `${apiUrl}proxy?product_id=${window.location.hash.substring(1)}&sku_id=${latestSkuId}`;

    let xhr = new XMLHttpRequest();
    xhr.onload = onDownloadsXhrChange;
    xhr.open("GET", url, true);
    xhr.send();
}

function onDownloadsXhrChange() {
    if (!(this.status == 200)) {
        processingError.style.display = "block";
        pleaseWait.style.display = "none";
        return;
    }

    let response = JSON.parse(this.responseText);

    if (pleaseWait.style.display != "block") return;

    pleaseWait.style.display = "none";
    msContent.style.display = "block";
    msContent.innerHTML = "";

    if (response.ProductDownloadOptions && response.ProductDownloadOptions.length > 0) {
        let header = document.createElement('h2');
        let displayLang = response.ProductDownloadOptions[0].LocalizedLanguage;
        let chineseLang = languageMap[displayLang] || displayLang;
        header.textContent = `${response.ProductDownloadOptions[0].ProductDisplayName} ${chineseLang}`;
        msContent.appendChild(header);

        response.ProductDownloadOptions.forEach(option => {
            let downloadButton = document.createElement('a');
            downloadButton.href = option.Uri;
            let raw_link = option.Uri.split('?')[0];
            downloadButton.textContent = raw_link.split('/').pop();
            downloadButton.target = "_blank";
            downloadButton.style.display = "block";
            downloadButton.style.margin = "8px 0";
            downloadButton.style.padding = "4px 8px";
            downloadButton.style.textDecoration = "none";
            downloadButton.style.backgroundColor = "#0078d7";
            downloadButton.style.color = "white";
            downloadButton.style.borderRadius = "4px";

            let br = document.createElement('br');
            msContent.appendChild(downloadButton);
            msContent.appendChild(br);
        });
    } else {
        msContent.innerHTML = "<p>没有可用的下载选项。</p>";
    }
}

function getLanguages(productId) {
    let url = `${apiUrl}skuinfo?product_id=${productId}`;
    let xhr = new XMLHttpRequest();
    xhr.onload = onLanguageXhrChange;
    xhr.open("GET", url, true);
    xhr.send();
}

function backToProducts() {
    backToProductsDiv.style.display = 'none';
    productsList.style.display = 'block';
    msContent.style.display = 'none';
    pleaseWait.style.display = 'none';
    processingError.style.display = 'none';

    window.location.hash = "";
    skuId = null; // 重置skuId
}

function prepareDownload(id) {
    productsList.style.display = 'none';
    backToProductsDiv.style.display = 'block';
    pleaseWait.style.display = "block";

    getLanguages(id);
}

function addTableElement(table, value, data) {
    let a = document.createElement('a')
    a.href = "#" + value;
    a.setAttribute("onClick", "prepareDownload(" + value + ");");
    a.appendChild(document.createTextNode(data[value]))

    let tr = table.insertRow();

    let td = tr.insertCell();
    td.appendChild(a);

    let td2 = tr.insertCell();
    td2.appendChild(document.createTextNode(value))
}

function createTable(data, search) {
    let table = document.getElementById('products-table-body');
    let regex = new RegExp('' + search + '', 'ig');

    table.innerHTML = "";

    for (value in data) {
        if (data[value].match(regex) == null)
            continue;

        addTableElement(table, value, data);
    }
}

function updateResults() {
    let search = document.getElementById('search-products');
    createTable(availableProducts, search.value);
}

function setSearch(query) {
    let search = document.getElementById('search-products');
    search.value = search.value == query ? null : query;
    updateResults();
}

function checkHash() {
    let hash = window.location.hash;
    if (hash.length == 0)
        return;

    prepareDownload(hash.substring(1));
}

function preparePage(resp) {
    availableProducts = JSON.parse(resp);
    if (!availableProducts) {
        pleaseWait.style.display = 'none';
        processingError.style.display = 'block';
        return;
    }

    pleaseWait.style.display = 'none';
    productsList.style.display = 'block';

    updateResults();
    checkHash();
}

// 初始化sessionId
sessionId.value = uuidv4();

// 加载产品列表
let xhr = new XMLHttpRequest();
xhr.onload = function () {
    if (this.status != 200) {
        pleaseWait.style.display = 'none';
        processingError.style.display = 'block';
        return;
    }
    preparePage(this.responseText);
};
xhr.open("GET", 'data/products.json', true);
xhr.send();

// 显示加载状态
pleaseWait.style.display = 'block';
