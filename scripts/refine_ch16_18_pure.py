# refine_ch16_18_pure.py
import os

ch16_path = r'C:\Users\Administrator\.gemini\antigravity\scratch\ainovel-engine\03_chapters\chapter_016.md'
ch17_path = r'C:\Users\Administrator\.gemini\antigravity\scratch\ainovel-engine\03_chapters\chapter_017.md'
ch18_path = r'C:\Users\Administrator\.gemini\antigravity\scratch\ainovel-engine\03_chapters\chapter_018.md'

# 1. 精修第16章
with open(ch16_path, 'r', encoding='utf-8') as f:
    c16 = f.read()

# 注入油膜、激流、震颤、咬合
target16_1 = '“上游用水时，将舌板向左转动三十度，插上熟铁横销，激流经消能槽顺畅滑入上游水渠，右侧槽口被双层厚木死死封死，滴水不漏！”\n\n“轮到下游用水，拔销转动舌板向右，水流瞬间改道直冲南原深沟。整个改道不过三息功夫，一人即可操作，绝无偷水漏水之嫌！”'
replace16_1 = '“上游用水时，将舌板向左转动三十度，插上熟铁横销紧密咬合，激流经消能槽顺畅滑入上游水渠，右侧槽口被双层厚木死死封死，滴水不漏！”\n\n“轮到下游用水，拔销转动舌板向右，汹涌激流顺着月牙弧面改道倾泻，槽板在激流冲击下发出沉稳的轻微震颤，水花直冲南原深沟。整个改道不过三息功夫，一人即可操作，绝无偷水漏水之嫌！”'
if target16_1 in c16:
    c16 = c16.replace(target16_1, replace16_1)

target16_2 = '哗啦啦！\n\n伴随着老兵们合力踩动脚踏板，沉重的翻车在南原急流中轰然旋转咬合！\n\n清澈激荡的水流顺着木槽咆哮而上，经过三级折返消能，温顺平稳地顺着双向分水舌奔涌而出，第一股甘霖精准地灌入了陈家庄干裂泛白的麦垄之中！'
replace16_2 = '哗啦啦！\n\n伴随着老兵们合力踩动脚踏板，沉重的翻车在南原急流中轰然旋转咬合！枣木轴瓦在熟猪油的浸润下泛起一层厚密油膜，隔绝干磨，吸纳水轮承载万钧激流时传导而来的剧烈震颤。\n\n清澈咆哮的水流顺着木槽咆哮而上，经过三级折返消能，水势在槽壁震颤中被层层化解，随后温顺平稳地顺着双向分水舌奔涌而出，第一股甘霖精准地灌入了陈家庄干裂泛白的麦垄之中！'
if target16_2 in c16:
    c16 = c16.replace(target16_2, replace16_2)

with open(ch16_path, 'w', encoding='utf-8') as f:
    f.write(c16)
print('Chapter 16 refined successfully.')

# 2. 精修第17章
with open(ch17_path, 'r', encoding='utf-8') as f:
    c17 = f.read()

# 消除双重标点？！
c17 = c17.replace('“世上哪有造车的白送，修车的还得倒贴一辈子的道理？！”', '“世上哪有造车的白送，修车的还得倒贴一辈子的道理？”')

# 注入油膜、咬合、激流、震颤
target17_1 = '“木构受水，激流冲刷，轴瓦每转十万圈必有磨损，叶片遇漂木暗石必有磕碰。不出两月，大车必生小恙！”'
replace17_1 = '“木构受水，激流冲刷，生铁大轴与枣木轴瓦在万斤重压下日夜咬合旋转。即便浸透了热猪油，润滑油膜也终有磨损耗尽之时；整架大车在激流震颤下，叶片遇漂木暗石更必有磕碰。不出两月，大车必生小恙！”'
if target17_1 in c17:
    c17 = c17.replace(target17_1, replace17_1)

target17_2 = '“其二，首期维保之资。苏家承揽落地之后首期三个月的巡检维护，含枣木瓦磨损换油、叶片加固，每架另加收八百文！”'
replace17_2 = '“其二，首期维保之资。苏家承揽落地之后首期三个月的巡检维护，含更换润滑油膜、复紧咬合榫卯与叶片加固，每架另加收八百文！”'
if target17_2 in c17:
    c17 = c17.replace(target17_2, replace17_2)

with open(ch17_path, 'w', encoding='utf-8') as f:
    f.write(c17)
print('Chapter 17 refined successfully.')

# 3. 精修第18章
with open(ch18_path, 'r', encoding='utf-8') as f:
    c18 = f.read()

# 消除双重标点？！
c18 = c18.replace('日后每卖一套，还能雷打不动白分四十文钱？！', '日后每卖一套，还能雷打不动白分四十文钱？')

# 注入油膜、咬合、激流、震颤
target18_1 = '“铁箍套死横梢，两端用这两枚热猪油浸透的老枣木方销顺着燕尾槽一插、一楔！”\n\n“平日转动时，激流撞过来，全靠燕尾斜面咬合泄力，稳当得很；若是哪天再倒霉撞上了秦岭冲下来的大烂木头，断的也只是外头那一截便宜的木板和这两根两文钱的枣木销钉，绝伤不到里头的主轴与大榫卯！”'
replace18_1 = '“铁箍套死横梢，内壁抹上一层厚实的猪油油膜，两端用这两枚热猪油浸透的老枣木方销顺着燕尾槽一插、一楔！”\n\n“平日转动时，激流撞过来，全靠燕尾斜面精准咬合泄力，化解水轮转动传导而来的剧烈震颤，稳当得很；若是哪天再倒霉撞上了秦岭冲下来的大烂木头，断的也只是外头那一截便宜的木板和这两根两文钱的枣木销钉，绝伤不到里头的主轴与大榫卯！”'
if target18_1 in c18:
    c18 = c18.replace(target18_1, replace18_1)

target18_2 = '仅仅用了一炷香的功夫，断裂的连杆茬口被切削平整，赵二叔锻打的熟铁半月卡箍狠狠咬合在轴上，两枚油润红亮的枣木方销顺着燕尾槽严丝合缝地楔入！\n\n老兵合力一踩，大轮轰然复转，咆哮的激流再次被稳稳挑入木槽，涌向干渴的麦田！'
replace18_2 = '仅仅用了一炷香的功夫，断裂的连杆茬口被切削平整，赵二叔锻打的熟铁半月卡箍带着温润油膜狠狠咬合在轴上，两枚油润红亮的枣木方销顺着燕尾槽严丝合缝地楔入！\n\n老兵合力一踩，大轮轰然复转，水轮在咆哮激流与欢腾震颤中重新昂扬运转，清冽的水浪再次被稳稳挑入木槽，涌向干渴的麦田！'
if target18_2 in c18:
    c18 = c18.replace(target18_2, replace18_2)

with open(ch18_path, 'w', encoding='utf-8') as f:
    f.write(c18)
print('Chapter 18 refined successfully.')
