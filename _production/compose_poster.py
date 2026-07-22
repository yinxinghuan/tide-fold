from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
image = Image.open(ROOT / '_production/poster-source.webp').convert('RGB')
# The transit source includes a pale gallery mat. Crop to the generated black
# optical-art field; the liquid itself remains untouched.
image = image.crop((64, 64, 960, 960)).resize((1024, 1024), Image.Resampling.LANCZOS)

overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)
for y in range(250):
    alpha = round(145 * (1 - y / 250) ** 1.7)
    draw.line((0, y, 1024, y), fill=(4, 15, 26, alpha))

title = 'TIDE FOLD'
font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 72)
x = 44
draw.text((x + 2, 39), title, font=font, fill=(0, 7, 14, 160))
draw.text((x, 36), title, font=font, fill=(237, 246, 247, 255))

image = Image.alpha_composite(image.convert('RGBA'), overlay).convert('RGB')
(ROOT / 'public').mkdir(exist_ok=True)
image.save(ROOT / 'public/poster.png', 'PNG', optimize=True)
image.resize((160, 160), Image.Resampling.LANCZOS).save(ROOT / '_production/poster-thumb.png', 'PNG', optimize=True)
