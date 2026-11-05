import os
import operator
from PIL import Image, ImageDraw, ImageFont, ImageFilter

mul = operator.mul

def create_gradient_mask(width, height, start_alpha, end_alpha, is_vertical=True):
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    if is_vertical:
        for y in range(height):
            ratio = y / float(height) if height > 0 else 0
            alpha = int(start_alpha + ratio * (end_alpha - start_alpha) if False else start_alpha + mul(ratio, (end_alpha - start_alpha)))
            draw.line([(0, y), (width, y)], fill=max(0, min(255, alpha)))
    return mask

def main():
    base_dir = r"C:\Users\Administrator\.gemini\antigravity\scratch\ainovel-engine"
    input_cover = os.path.join(base_dir, r"assets\covers\cover_datang_trendy.jpg")
    output_cover = os.path.join(base_dir, r"assets\covers\cover_datang_final.jpg")
    output_png = os.path.join(base_dir, r"assets\covers\cover_datang_final.png")
    
    img = Image.open(input_cover).convert("RGBA")
    w, h = img.size
    
    # 1. 顶部与底部半透明渐变暗场，确保文字绝对清晰
    top_overlay_h = 360
    top_mask = create_gradient_mask(w, top_overlay_h, 215, 0)
    top_dark = Image.new("RGBA", (w, top_overlay_h), (8, 12, 22, 255))
    img.paste(top_dark, (0, 0), top_mask)
    
    bottom_overlay_h = 280
    bottom_mask = create_gradient_mask(w, bottom_overlay_h, 0, 235)
    bottom_dark = Image.new("RGBA", (w, bottom_overlay_h), (8, 12, 22, 255))
    img.paste(bottom_dark, (0, h - bottom_overlay_h), bottom_mask)
    
    draw = ImageDraw.Draw(img)
    
    # 字体加载
    font_hei = r"C:\Windows\Fonts\simhei.ttf"
    font_yahei = r"C:\Windows\Fonts\msyhbd.ttc"
    font_kaiti = r"C:\Windows\Fonts\STKAITI.TTF"
    if not os.path.exists(font_kaiti):
        font_kaiti = r"C:\Windows\Fonts\simkai.ttf"
        
    font_title = ImageFont.truetype(font_hei, 82)
    font_slogan = ImageFont.truetype(font_yahei, 22)
    font_tagline = ImageFont.truetype(font_yahei, 20)
    font_badge = ImageFont.truetype(font_yahei, 18)
    font_author_name = ImageFont.truetype(font_yahei, 34)
    font_author_sub = ImageFont.truetype(font_yahei, 24)
    font_seal = ImageFont.truetype(font_kaiti, 14)
    font_pill = ImageFont.truetype(font_yahei, 16)
    
    # 2. 绘制顶部徽章
    # 徽章1：番茄官方签约 (红金)
    b1_text = "番茄官方签约"
    b1_bbox = font_badge.getbbox(b1_text)
    b1_w = b1_bbox[2] - b1_bbox[0] + 32
    b1_h = 38
    b1_x = 180
    b1_y = 38
    draw.rounded_rectangle([b1_x, b1_y, b1_x + b1_w, b1_y + b1_h], radius=6, fill=(168, 28, 28, 230), outline=(255, 180, 180, 200), width=1)
    draw.text((b1_x + 16, b1_y + 8), b1_text, font=font_badge, fill=(255, 245, 245))
    
    # 徽章2：无系统 · 硬核大唐工业
    b2_text = "无系统 · 硬核大唐工业"
    b2_bbox = font_badge.getbbox(b2_text)
    b2_w = b2_bbox[2] - b2_bbox[0] + 32
    b2_h = 38
    b2_x = b1_x + b1_w + 16
    b2_y = 38
    draw.rounded_rectangle([b2_x, b2_y, b2_x + b2_w, b2_y + b2_h], radius=6, fill=(18, 26, 46, 230), outline=(255, 215, 0, 180), width=1)
    draw.text((b2_x + 16, b2_y + 8), b2_text, font=font_badge, fill=(255, 225, 100))
    
    # 3. 副标宣法语
    slogan_text = "一柄规尺度乾坤 · 万吨渭水逆天流"
    s_bbox = font_slogan.getbbox(slogan_text)
    s_w = s_bbox[2] - s_bbox[0]
    s_x = int((w - s_w) / 2)
    s_y = 102
    # 阴影
    draw.text((s_x + 2, s_y + 2), slogan_text, font=font_slogan, fill=(0, 0, 0, 220))
    draw.text((s_x, s_y), slogan_text, font=font_slogan, fill=(225, 235, 245))
    
    # 4. 核心主书名《大唐第一工科生》
    title_text = "大唐第一工科生"
    t_bbox = font_title.getbbox(title_text)
    t_w = t_bbox[2] - t_bbox[0]
    t_x = int((w - t_w) / 2)
    t_y = 142
    
    # 厚重立体阴影 (8个方向扩散)
    for dx in range(-4, 5):
        for dy in range(-4, 5):
            if abs(dx) + abs(dy) > 0:
                draw.text((t_x + dx, t_y + dy), title_text, font=font_title, fill=(10, 5, 0, 255))
    for dy in range(1, 9):
        draw.text((t_x, t_y + dy), title_text, font=font_title, fill=(20, 10, 2, 255))
        
    # 金色描边
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            draw.text((t_x + dx, t_y + dy), title_text, font=font_title, fill=(180, 120, 20, 255))
            
    # 正文金黄填色
    draw.text((t_x, t_y), title_text, font=font_title, fill=(255, 238, 140, 255))
    # 上半截高光
    draw.text((t_x, t_y - 1), title_text, font=font_title, fill=(255, 255, 240, 180))
    
    # 5. 书名下方装饰金线与标签
    tag_sub = "手搓盛唐第一工业帝国"
    ts_bbox = font_tagline.getbbox(tag_sub)
    ts_w = ts_bbox[2] - ts_bbox[0]
    ts_x = int((w - ts_w) / 2)
    ts_y = 246
    
    # 装饰线
    line_w = 120
    draw.line([(ts_x - line_w - 20, ts_y + 12), (ts_x - 20, ts_y + 12)], fill=(255, 215, 0, 180), width=2)
    draw.line([(ts_x + ts_w + 20, ts_y + 12), (ts_x + ts_w + line_w + 20, ts_y + 12)], fill=(255, 215, 0, 180), width=2)
    
    draw.text((ts_x + 1, ts_y + 1), tag_sub, font=font_tagline, fill=(0, 0, 0, 220))
    draw.text((ts_x, ts_y), tag_sub, font=font_tagline, fill=(255, 225, 120))
    
    # 6. 底部特征标签组
    pills = ["机械水利", "物理降维", "君臣相知", "盛唐风骨"]
    total_pills_w = 0
    pill_widths = []
    for p in pills:
        pb = font_pill.getbbox(p)
        pw = pb[2] - pb[0] + 28
        pill_widths.append(pw)
        total_pills_w += pw
    total_pills_w += 14 * (len(pills) - 1)
    
    curr_px = int((w - total_pills_w) / 2)
    p_y = h - 145
    for i, p in enumerate(pills):
        pw = pill_widths[i]
        draw.rounded_rectangle([curr_px, p_y, curr_px + pw, p_y + 32], radius=16, fill=(12, 18, 32, 220), outline=(100, 200, 255, 160), width=1)
        draw.text((curr_px + 14, p_y + 6), p, font=font_pill, fill=(165, 243, 252))
        curr_px += pw + 14
        
    # 7. 底部作者名与朱砂印章
    author_name = "踏月难留香"
    author_sub = "著"
    an_bbox = font_author_name.getbbox(author_name)
    an_w = an_bbox[2] - an_bbox[0]
    as_bbox = font_author_sub.getbbox(author_sub)
    as_w = as_bbox[2] - as_bbox[0]
    
    seal_size = 46
    gap1 = 12
    gap2 = 18
    total_author_w = an_w + gap1 + as_w + gap2 + seal_size
    start_ax = int((w - total_author_w) / 2)
    author_y = h - 90
    
    # 绘制作者名
    draw.text((start_ax + 2, author_y + 2), author_name, font=font_author_name, fill=(0, 0, 0, 230))
    draw.text((start_ax, author_y), author_name, font=font_author_name, fill=(255, 255, 255))
    
    # 绘制“著”字
    sub_x = start_ax + an_w + gap1
    draw.text((sub_x + 1, author_y + 8), author_sub, font=font_author_sub, fill=(0, 0, 0, 200))
    draw.text((sub_x, author_y + 7), author_sub, font=font_author_sub, fill=(203, 213, 225))
    
    # 绘制朱砂印章
    seal_x = sub_x + as_w + gap2
    seal_y = author_y - 3
    draw.rounded_rectangle([seal_x, seal_y, seal_x + seal_size, seal_y + seal_size], radius=4, fill=(153, 27, 27, 240), outline=(239, 68, 68, 220), width=2)
    # 印章文字两行：踏留 / 月香
    draw.text((seal_x + 7, seal_y + 5), "踏留", font=font_seal, fill=(254, 242, 242))
    draw.text((seal_x + 7, seal_y + 23), "月香", font=font_seal, fill=(254, 242, 242))
    
    # 保存结果 (高质量 JPG 与 PNG)
    final_rgb = img.convert("RGB")
    final_rgb.save(output_cover, "JPEG", quality=95)
    img.save(output_png, "PNG")
    print(f"Success! Saved to {output_cover} and {output_png}")

if __name__ == "__main__":
    main()
