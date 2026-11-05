import os
import operator
from PIL import Image, ImageDraw, ImageFont

mul = operator.mul

def create_gradient_mask(width, height, start_alpha, end_alpha, is_vertical=True):
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    if is_vertical:
        for y in range(height):
            ratio = y / float(height) if height > 0 else 0
            alpha = int(start_alpha + mul(ratio, (end_alpha - start_alpha)))
            draw.line([(0, y), (width, y)], fill=max(0, min(255, alpha)))
    return mask

def main():
    base_dir = r"C:\Users\Administrator\.gemini\antigravity\scratch\ainovel-engine"
    input_cover = os.path.join(base_dir, r"assets\covers\cover_datang_trendy.jpg")
    output_cover = os.path.join(base_dir, r"assets\covers\cover_datang_final.jpg")
    output_png = os.path.join(base_dir, r"assets\covers\cover_datang_final.png")
    
    img = Image.open(input_cover).convert("RGBA")
    w, h = img.size
    
    # 顶部与底部轻量柔和遮罩，仅为确保文字清晰，绝不遮挡中间画面
    top_overlay_h = 320
    top_mask = create_gradient_mask(w, top_overlay_h, 195, 0)
    top_dark = Image.new("RGBA", (w, top_overlay_h), (5, 8, 18, 255))
    img.paste(top_dark, (0, 0), top_mask)
    
    bottom_overlay_h = 180
    bottom_mask = create_gradient_mask(w, bottom_overlay_h, 0, 195)
    bottom_dark = Image.new("RGBA", (w, bottom_overlay_h), (5, 8, 18, 255))
    img.paste(bottom_dark, (0, h - bottom_overlay_h), bottom_mask)
    
    draw = ImageDraw.Draw(img)
    
    # 字体加载
    font_hei = r"C:\Windows\Fonts\simhei.ttf"
    font_yahei = r"C:\Windows\Fonts\msyhbd.ttc"
    font_kaiti = r"C:\Windows\Fonts\STKAITI.TTF"
    if not os.path.exists(font_kaiti):
        font_kaiti = r"C:\Windows\Fonts\simkai.ttf"
        
    font_title_line1 = ImageFont.truetype(font_hei, 58)
    font_title_line2 = ImageFont.truetype(font_hei, 65)
    font_author_name = ImageFont.truetype(font_yahei, 36)
    font_author_sub = ImageFont.truetype(font_yahei, 26)
    font_seal = ImageFont.truetype(font_kaiti, 15)
    
    # ---------------- 核心元素一：小说名字 ----------------
    # 第一行：大唐：盗我抗旱图？
    t1_text = "大唐：盗我抗旱图？"
    t1_bbox = font_title_line1.getbbox(t1_text)
    t1_w = t1_bbox[2] - t1_bbox[0]
    t1_x = int((w - t1_w) / 2)
    t1_y = 75
    
    # 多层立体投影
    for dx in range(-4, 5):
        for dy in range(-4, 5):
            if abs(dx) + abs(dy) > 0:
                draw.text((t1_x + dx, t1_y + dy), t1_text, font=font_title_line1, fill=(8, 4, 0, 255))
    for dy in range(1, 8):
        draw.text((t1_x, t1_y + dy), t1_text, font=font_title_line1, fill=(20, 10, 2, 255))
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            draw.text((t1_x + dx, t1_y + dy), t1_text, font=font_title_line1, fill=(185, 125, 20, 255))
    draw.text((t1_x, t1_y), t1_text, font=font_title_line1, fill=(255, 242, 165, 255))
    draw.text((t1_x, t1_y - 1), t1_text, font=font_title_line1, fill=(255, 255, 245, 180))
    
    # 第二行：我造神车诛你九族！
    t2_text = "我造神车诛你九族！"
    t2_bbox = font_title_line2.getbbox(t2_text)
    t2_w = t2_bbox[2] - t2_bbox[0]
    t2_x = int((w - t2_w) / 2)
    t2_y = 152
    
    for dx in range(-5, 6):
        for dy in range(-5, 6):
            if abs(dx) + abs(dy) > 0:
                draw.text((t2_x + dx, t2_y + dy), t2_text, font=font_title_line2, fill=(10, 3, 0, 255))
    for dy in range(1, 9):
        draw.text((t2_x, t2_y + dy), t2_text, font=font_title_line2, fill=(25, 8, 2, 255))
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            draw.text((t2_x + dx, t2_y + dy), t2_text, font=font_title_line2, fill=(215, 95, 20, 255))
    draw.text((t2_x, t2_y), t2_text, font=font_title_line2, fill=(255, 218, 55, 255))
    draw.text((t2_x, t2_y - 1), t2_text, font=font_title_line2, fill=(255, 250, 210, 200))
    
    # ---------------- 核心元素二：作者名字 ----------------
    author_name = "踏月难留香"
    author_sub = "著"
    an_bbox = font_author_name.getbbox(author_name)
    an_w = an_bbox[2] - an_bbox[0]
    as_bbox = font_author_sub.getbbox(author_sub)
    as_w = as_bbox[2] - as_bbox[0]
    
    seal_size = 48
    gap1 = 12
    gap2 = 18
    total_author_w = an_w + gap1 + as_w + gap2 + seal_size
    start_ax = int((w - total_author_w) / 2)
    author_y = h - 95
    
    # 作者名（立体双阴影）
    draw.text((start_ax + 2, author_y + 2), author_name, font=font_author_name, fill=(0, 0, 0, 240))
    draw.text((start_ax, author_y), author_name, font=font_author_name, fill=(255, 255, 255))
    
    # 著字
    sub_x = start_ax + an_w + gap1
    draw.text((sub_x + 1, author_y + 8), author_sub, font=font_author_sub, fill=(0, 0, 0, 220))
    draw.text((sub_x, author_y + 7), author_sub, font=font_author_sub, fill=(215, 225, 235))
    
    # 朱砂印章
    seal_x = sub_x + as_w + gap2
    seal_y = author_y - 3
    draw.rounded_rectangle([seal_x, seal_y, seal_x + seal_size, seal_y + seal_size], radius=4, fill=(160, 25, 25, 240), outline=(245, 75, 75, 230), width=2)
    draw.text((seal_x + 8, seal_y + 5), "踏留", font=font_seal, fill=(255, 245, 245))
    draw.text((seal_x + 8, seal_y + 24), "月香", font=font_seal, fill=(255, 245, 245))
    
    # 保存结果
    final_rgb = img.convert("RGB")
    final_rgb.save(output_cover, "JPEG", quality=95)
    img.save(output_png, "PNG")
    print(f"Success! Clean cover generated: {output_cover}")

if __name__ == "__main__":
    main()
