const fs = require('fs');

// 1. 更新 02_memories/chapter_summaries.md
let summaries = fs.readFileSync('02_memories/chapter_summaries.md', 'utf8');

const ch10_12_summary = `
- 第10章《崔家的车停了》：崔车满载后生湿榆木主辐条承受交变剪切应力超限脆断崩飞，主轴干磨咬死卡死；家丁依苏白示警斜向避险无人重伤；周主簿喝止崔福以铁棍强撬巨车；苏车随后出战，因立柱迎水弹性偏移出水抛物线外偏半尺，首股急流全洒荒滩。
- 第11章《水进沟了》：苏白临危不乱双招纠偏（老兵收力降速半成收缩抛物线、王木匠重夯骑马桩平移阶梯消能槽半尺对位）；三级折返消能激起强迫水跃化解下冲动能，两里深沟零冲刷零塌方；三名书吏唱诺硬核数据（运转整整半个时辰、入垄一尺二寸、停机零次）；各庄里正与长安粮行蜂拥认购。
- 第12章《工坊归工坊欠账归欠账》：官渠司行文批复五贯料钱安排南原小渠十日试灌；公堂之上赵大山呈递一式三份官印清册；明府相公援引断狱律当堂开枷释放苏成海，判决工坊归工坊、欠账归欠账；五贯官钱结清车资工料欠款，全家与乡邻欢聚共享猪肉大馒头；章末伏笔直指崔浩报案底样物理破绽。
`;

if (!summaries.includes('第10章《崔家的车停了》')) {
    const legacyIdx = summaries.indexOf('## 历史归档版本');
    if (legacyIdx !== -1) {
        summaries = summaries.slice(0, legacyIdx) + ch10_12_summary + '\n' + summaries.slice(legacyIdx);
    } else {
        summaries += ch10_12_summary;
    }
    fs.writeFileSync('02_memories/chapter_summaries.md', summaries.trim() + '\n', 'utf8');
    console.log('chapter_summaries.md updated');
}

// 2. 更新 confirmed_chapters.md
let confirmed = fs.readFileSync('confirmed_chapters.md', 'utf8');

const newConfirmedRows = `| 第10章 | 崔家的车停了 | 3406 | 六大子智能体全票通过 | 崔车自激共振主辐条崩断主轴卡死，家丁避险脱困，周主簿叫停强撬，苏车立柱微变形抛物线外偏半尺 |
| 第11章 | 水进沟了 | 2891 | 六大子智能体全票通过 | 降速半成微调抛物线，重夯骑马桩平移消能槽半尺，三级折返消能入垄一尺二寸，半个时辰零停机零塌方引发抢订 |
| 第12章 | 工坊归工坊欠账归欠账 | 3380 | 六大子智能体全票通过 | 官渠拨付五贯料钱安排南原试灌，公堂里正官印清册大破诬陷，当堂开枷释放老父，结清旧账炖肉庆功 |
`;

if (!confirmed.includes('第10章 | 崔家的车停了')) {
    const legacyTableIdx = confirmed.indexOf('## 历史快速通道版本归档');
    if (legacyTableIdx !== -1) {
        confirmed = confirmed.slice(0, legacyTableIdx) + newConfirmedRows + '\n' + confirmed.slice(legacyTableIdx);
    } else {
        confirmed += newConfirmedRows;
    }
    fs.writeFileSync('confirmed_chapters.md', confirmed.trim() + '\n', 'utf8');
    console.log('confirmed_chapters.md updated');
}
