// 全局变量
let wordList = [];         // 所有单词对
let remainingList = [];    // 尚未匹配的单词对
let currentBatch = [];     // 当前匹配的批次
let score = 0;             // 当前批次得分
let totalPairs = 0;        // 当前批次总数
let soundOn = true;
let currentLine = null;    // 当前连线
let isDragging = false;    // 是否正在拖拽
let lines = [];            // 所有固定的连线
let savedWordLists = JSON.parse(localStorage.getItem('savedWordLists')) || {};
let currentListIndex = 0;
let wordListNames = [];

// 获取DOM元素
const wordInputSection = document.getElementById('wordInputSection');
const gameSection = document.getElementById('gameSection');
const rewardSection = document.getElementById('rewardSection');
const wordInput = document.getElementById('wordInput');
const startGameButton = document.getElementById('startGame');
const nextPageButton = document.getElementById('nextPage');
const shuffleGameButton = document.getElementById('shuffleGame');
const wordsContainer = document.getElementById('words');
const imagesContainer = document.getElementById('images');
const scoreDisplay = document.getElementById('score');
const starsDisplay = document.getElementById('stars');
const themeToggle = document.getElementById('themeToggle');
const soundToggle = document.getElementById('soundToggle');
const svgCanvas = document.getElementById('svgCanvas'); // SVG用于连线
const loadSavedListButton = document.getElementById('loadSavedList'); // 新增按钮

// 音效文件
const correctSound = new Audio('correct.wav');
const wrongSound = new Audio('wrong.wav');

// 事件监听
startGameButton.addEventListener('click', startGame);
nextPageButton.addEventListener('click', loadNextBatch);
shuffleGameButton.addEventListener('click', shuffleGame);
themeToggle.addEventListener('click', toggleTheme);
soundToggle.addEventListener('click', toggleSound);
loadSavedListButton.addEventListener('click', loadSavedList); // 新增事件监听

// 切换主题
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}

// 切换音效
function toggleSound() {
    soundOn = !soundOn;
    soundToggle.textContent = `音效：${soundOn ? '开' : '关'}`;
}

// 开始游戏
function startGame() {
    const inputText = wordInput.value.trim();
    if (inputText === '') {
        alert('请输入单词表！');
        return;
    }
    // 根据"="分割中英文单词对
    wordList = inputText.split('\n').map(line => {
        const [english, chinese] = line.split('=').map(item => item.trim());
        if (!english || !chinese) return null;
        return { english, chinese };
    }).filter(item => item !== null);

    if (wordList.length === 0) {
        alert('单词表不能为空或格式错误！');
        return;
    }

    // 检查是否是新的单词表
    const isNewList = !Object.values(savedWordLists).some(list => 
        JSON.stringify(list) === JSON.stringify(wordList)
    );

    if (isNewList) {
        // 如果是新的单词表，提示用户命名
        const listName = prompt('这是一个新的单词列表，请为它命名:');
        if (listName) {
            savedWordLists[listName] = wordList;
            localStorage.setItem('savedWordLists', JSON.stringify(savedWordLists));
            console.log('Word list saved:', listName);
        }
    }

    // 重置当前列表索引和列表名称数组
    currentListIndex = 0;
    wordListNames = Object.keys(savedWordLists);

    remainingList = [...wordList];
    wordInputSection.style.display = 'none';
    gameSection.style.display = 'block';
    loadNextBatch();
}

// 加载下一批次的题目
function loadNextBatch() {
    if (remainingList.length === 0) {
        // 当前单词表已完成，尝试加载下一个单词表
        currentListIndex++;
        if (currentListIndex < wordListNames.length) {
            // 还有下一个单词表
            const nextListName = wordListNames[currentListIndex];
            wordList = savedWordLists[nextListName];
            remainingList = [...wordList];
            alert(`正在加载下一个单词表：${nextListName}`);
        } else {
            // 没有更多单词表，返回首页
            gameSection.style.display = 'none';
            rewardSection.style.display = 'none';
            wordInputSection.style.display = 'block';
            alert('所有单词表已完成！返回首页。');
            return;
        }
    }

    // 选择10题或剩余题数
    currentBatch = remainingList.slice(0, 10);
    remainingList = remainingList.slice(10);

    totalPairs = currentBatch.length;
    score = 0;
    scoreDisplay.textContent = `得分：${score} / ${totalPairs}`;
    initGame();
}

// 初始化游戏界面
function initGame() {
    wordsContainer.innerHTML = '';
    imagesContainer.innerHTML = '';
    svgCanvas.innerHTML = ''; // 清空之前的连线
    lines = []; // 重置连线数组

    const shuffledWords = shuffleArray([...currentBatch]);
    const shuffledImages = shuffleArray([...currentBatch]);

    // 左边框显示英文
    shuffledWords.forEach(pair => {
        const wordElem = document.createElement('div');
        wordElem.textContent = pair.english;
        wordElem.classList.add('draggable');
        wordElem.setAttribute('draggable', 'true');
        wordElem.addEventListener('dragstart', dragStart);
        wordElem.addEventListener('drag', dragging);
        wordElem.addEventListener('dragend', dragEnd);
        wordElem.setAttribute('id', `word-${pair.english}`); // 给每个单词加上ID
        wordsContainer.appendChild(wordElem);
    });

    // 右边框显示中文，并条块化
    shuffledImages.forEach(pair => {
        const imgElem = document.createElement('div');
        imgElem.textContent = pair.chinese;
        imgElem.classList.add('droppable');
        imgElem.addEventListener('dragover', dragOver);
        imgElem.addEventListener('drop', drop);
        imgElem.setAttribute('id', `image-${pair.chinese}`); // 给每个中文加上ID
        imagesContainer.appendChild(imgElem);
    });
}

// 打乱顺序并重新开始当前批次
function shuffleGame() {
    currentBatch = shuffleArray([...currentBatch]);
    initGame();
}

// 拖拽开始
function dragStart(event) {
    const wordElem = event.target;
    event.dataTransfer.setData('text/plain', event.target.textContent);

    // 获取起点坐标（相对于SVG容器）
    const rect = wordElem.getBoundingClientRect();
    const svgRect = svgCanvas.getBoundingClientRect();
    const x1 = rect.left + rect.width / 2 - svgRect.left;
    const y1 = rect.top + rect.height / 2 - svgRect.top;

    // 创建SVG线条
    currentLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    currentLine.setAttribute('x1', x1);
    currentLine.setAttribute('y1', y1);
    currentLine.setAttribute('x2', x1);
    currentLine.setAttribute('y2', y1);
    currentLine.classList.add('line', 'temp-line'); // 添加 temp-line 类
    svgCanvas.appendChild(currentLine);

    isDragging = true;

    // 使用 drag 事件而不是 mousemove
    event.target.addEventListener('drag', updateLinePosition);
}

// 拖拽过程中更新连线位置
function dragging(event) {
    // 连线已在 updateLinePosition 中实时更新，不需要额外处理
}

// 拖拽结束
function dragEnd(event) {
    if (isDragging) {
        // 移除所有临时线条
        const tempLines = svgCanvas.querySelectorAll('.temp-line');
        tempLines.forEach(line => svgCanvas.removeChild(line));
        
        currentLine = null;
        isDragging = false;
        event.target.removeEventListener('drag', updateLinePosition);
    }
}

// 更新线条位置
function updateLinePosition(event) {
    if (isDragging && currentLine) {
        const svgRect = svgCanvas.getBoundingClientRect();
        const x2 = event.clientX - svgRect.left;
        const y2 = event.clientY - svgRect.top;
        currentLine.setAttribute('x2', x2);
        currentLine.setAttribute('y2', y2);
    }
}

// 拖拽经过目标元素
function dragOver(event) {
    event.preventDefault();
}

// 放置元素
function drop(event) {
    event.preventDefault();
    const draggedWord = event.dataTransfer.getData('text/plain');
    const targetWord = event.target.textContent;

    const correctPair = currentBatch.find(pair => pair.english === draggedWord && pair.chinese === targetWord);

    if (correctPair) {
        event.target.classList.add('matched');
        event.target.removeEventListener('drop', drop);
        event.target.removeEventListener('dragover', dragOver);
        const draggables = document.querySelectorAll('.draggable');
        draggables.forEach(elem => {
            if (elem.textContent === draggedWord) {
                elem.classList.add('matched');
                elem.setAttribute('draggable', 'false');
            }
        });
        score++;
        scoreDisplay.textContent = `得分：${score} / ${totalPairs}`;
        if (soundOn) correctSound.play();

        // 固定线条终点到目标元素中心
        const targetRect = event.target.getBoundingClientRect();
        const svgRect = svgCanvas.getBoundingClientRect();
        const x2 = targetRect.left + targetRect.width / 2 - svgRect.left;
        const y2 = targetRect.top + targetRect.height / 2 - svgRect.top;
        currentLine.setAttribute('x2', x2);
        currentLine.setAttribute('y2', y2);
        currentLine.classList.remove('temp-line');
        currentLine.classList.add('matched'); // 添加 matched 类

        // 将当前线条保存到lines数组
        lines.push(currentLine);
        currentLine = null;
        isDragging = false;
        event.target.removeEventListener('drag', updateLinePosition);

        // 检查是否完成当前批次
        checkBatchCompletion();
    } else {
        if (soundOn) wrongSound.play();
        // 如果匹配错误，移除所有临时线条
        const tempLines = svgCanvas.querySelectorAll('.temp-line');
        tempLines.forEach(line => svgCanvas.removeChild(line));
        
        currentLine = null;
        isDragging = false;
        event.target.removeEventListener('drag', updateLinePosition);
    }
}

// 检查当前批次是否完成
function checkBatchCompletion() {
    if (score === totalPairs) {
        if (remainingList.length > 0) {
            alert('本批次完成！即将进入下一批次。');
        } else {
            alert('本单词表完成！即将进入下一个单词表。');
        }
        loadNextBatch();
    }
}

// 检查是否完成所有匹配
function checkCompletion() {
    if (score === totalPairs) {
        gameSection.style.display = 'none';
        rewardSection.style.display = 'block';
    }
}

// 工具函数：打乱数组顺序
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

// 加载保存的单词列表
function loadSavedList() {
    const savedListContainer = document.createElement('div');
    savedListContainer.id = 'savedListContainer';
    savedListContainer.innerHTML = '<h3>保存的单词列表</h3>';

    for (const listName in savedWordLists) {
        const listItem = document.createElement('div');
        listItem.className = 'saved-list-item';
        listItem.innerHTML = `
            <span>${listName}</span>
            <button onclick="loadList('${listName}')">加载</button>
            <button onclick="deleteList('${listName}')">删除</button>
        `;
        savedListContainer.appendChild(listItem);
    }

    const closeButton = document.createElement('button');
    closeButton.textContent = '关闭';
    closeButton.onclick = () => document.body.removeChild(savedListContainer);
    savedListContainer.appendChild(closeButton);

    document.body.appendChild(savedListContainer);
}

function loadList(listName) {
    const list = savedWordLists[listName];
    if (list) {
        wordInput.value = list.map(pair => `${pair.english}=${pair.chinese}`).join('\n');
        document.body.removeChild(document.getElementById('savedListContainer'));
    }
}

function deleteList(listName) {
    if (confirm(`确定要删除 "${listName}" 吗？`)) {
        delete savedWordLists[listName];
        localStorage.setItem('savedWordLists', JSON.stringify(savedWordLists));
        document.body.removeChild(document.getElementById('savedListContainer'));
        loadSavedList(); // 重新加载列表
    }
}
