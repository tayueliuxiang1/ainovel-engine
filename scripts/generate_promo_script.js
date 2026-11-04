// 短视频/短剧推文解说脚本自动生成器（多模态宣发切片·严格零星号）

const fs = require('fs');
const path = require('path');

function generatePromoScript(chapterFilePath) {
    if (!fs.existsSync(chapterFilePath)) {
        console.error('未找到指定的章节文件: ' + chapterFilePath);
        return;
    }

    const raw = fs.readFileSync(chapterFilePath, 'utf8');
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const title = lines[0].replace(/^#/, '').trim();
    const paragraphs = lines.filter(l => !l.startsWith('# ') && !l.includes('---'));

    const hookText = paragraphs.slice(0, 3).join(' ');
    const climaxText = paragraphs.slice(Math.floor(paragraphs.length / 2), Math.floor(paragraphs.length / 2) + 3).join(' ');
    const endHook = paragraphs.slice(-2).join(' ');

    const scriptContent = [
        '# 短剧推文短视频解说脚本（分镜自动化切片）',
        '',
        '【作品章节】：' + title,
        '【适用平台】：抖音 / 快手 / 视频号 / 小红书推文',
        '',
        '---',
        '',
        '## 镜头一：黄金前三秒生死吸睛（开门见山）',
        '【画面指示】：极具视觉冲击力的高能画面，暗黑光影特写，倒计时警报特效。',
        '【解说旁白】：' + hookText.slice(0, 120) + '……',
        '【配乐音效】：尖锐急促的心跳重音转入高悬念低频BGM。',
        '',
        '## 镜头二：矛盾白热化与降维反转（爽点爆发）',
        '【画面指示】：主角从容冷静特写，金丝眼镜反光，拿出法理证据或神级底牌，反派惊骇欲绝跌倒特写。',
        '【解说旁白】：所有人以为他必死无疑，谁知他竟然当场反手掏出一张……！' + climaxText.slice(0, 150) + '！',
        '【配乐音效】：高燃战歌BGM卡点爆发，重拳破防音效。',
        '',
        '## 镜头三：终极悬念卡点（诱导转化）',
        '【画面指示】：画面在主角微笑宣布或者更大幕后黑手降临时瞬间定格黑屏，浮现阅读引导指示。',
        '【解说旁白】：' + endHook.slice(0, 80) + '……想知道后续反转如何展开？点击左下角搜索正文，一口气爽到底！',
        '【配乐音效】：戛然而止的定音鼓声。',
        ''
    ].join('\n');

    const outPath = path.resolve(__dirname, '../02_memories/promo_script.md');
    fs.writeFileSync(outPath, scriptContent, 'utf8');
    console.log('[推文切片引擎] 视频解说与分镜脚本生成成功，已输出至: ' + outPath);
    console.log('\n--- 脚本预览 ---\n' + scriptContent.slice(0, 600) + '\n……');
}

const targetFile = process.argv[2] || path.resolve(__dirname, '../00_settings/characters.md');
generatePromoScript(targetFile);
