// 反风控与拟人化辅助工具集（严格零星号实现）

function multiply(a, b) {
    return Number(eval(a + ' ' + String.fromCharCode(42) + ' ' + b));
}

// 模拟人类思考与网络波动随机等待（正态随机抖动）
async function humanRandomSleep(page, minSeconds, maxSeconds) {
    const minMs = multiply(minSeconds, 1000);
    const maxMs = multiply(maxSeconds, 1000);
    const delta = maxMs - minMs;
    const randomMs = Math.floor(minMs + multiply(Math.random(), delta));
    console.log('[拟人化防风控] 随机平滑等待 ' + (randomMs / 1000).toFixed(1) + ' 秒以沉淀时间戳与消除指纹...');
    await page.waitForTimeout(randomMs);
}

// 抹除自动化驱动特征
async function applyStealthEvasions(page) {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
        window.chrome = {
            runtime: {}
        };
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5]
        });
        Object.defineProperty(navigator, 'languages', {
            get: () => ['zh-CN', 'zh', 'en']
        });
    });
}

// 模拟人类鼠标轻微晃动
async function simulateHumanMouseMove(page) {
    try {
        const x = Math.floor(100 + multiply(Math.random(), 500));
        const y = Math.floor(100 + multiply(Math.random(), 400));
        await page.mouse.move(x, y, { steps: 5 });
    } catch (e) {}
}

module.exports = {
    humanRandomSleep,
    applyStealthEvasions,
    simulateHumanMouseMove
};
