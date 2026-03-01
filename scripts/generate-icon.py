"""
Generate the ToDo.md app icon (1024x1024 PNG).

Design: Rounded teal square with a white checkmark + "ToDo.md" and task list lines.
Run:  python3 scripts/generate-icon.py
"""

from PIL import Image, ImageDraw, ImageFont
import os

SIZE = 1024
PAD = 12
OUT = os.path.join(os.path.dirname(__file__), '..', 'electron', 'icons', 'icon.png')

# Colors
TEAL = (34, 180, 120)
WHITE = (255, 255, 255)
WHITE_70 = (255, 255, 255, 178)
WHITE_30 = (255, 255, 255, 77)

img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

radius = int(SIZE / 4.5)

# ── Solid rounded-rect background ────────────────────────────────
draw.rounded_rectangle(
    [PAD, PAD, SIZE - PAD, SIZE - PAD],
    radius=radius,
    fill=TEAL
)

# ── Checkbox (rounded square with checkmark) ─────────────────────
box_size = 260
box_x = 148
box_y = 150
box_r = 44

draw.rounded_rectangle(
    [box_x, box_y, box_x + box_size, box_y + box_size],
    radius=box_r,
    fill=None,
    outline=WHITE,
    width=24
)

# Checkmark
check_pts = [
    (box_x + 58,  box_y + 135),
    (box_x + 118, box_y + 200),
    (box_x + 212, box_y + 68),
]
draw.line([check_pts[0], check_pts[1]], fill=WHITE, width=28, joint='curve')
draw.line([check_pts[1], check_pts[2]], fill=WHITE, width=28, joint='curve')
for pt in check_pts:
    draw.ellipse([pt[0] - 12, pt[1] - 12, pt[0] + 12, pt[1] + 12], fill=WHITE)

# ── Text: "ToDo" + ".md" ────────────────────────────────────────
try:
    font_todo = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 160)
    font_md = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 96)
except OSError:
    font_todo = ImageFont.load_default()
    font_md = ImageFont.load_default()

text_x = box_x + box_size + 28
draw.text((text_x, box_y + 10), "ToDo", fill=WHITE, font=font_todo)
draw.text((text_x + 8, box_y + 175), ".md", fill=WHITE_70, font=font_md)

# ── Divider line ─────────────────────────────────────────────────
div_y = 490
draw.rounded_rectangle(
    [148, div_y, SIZE - 148, div_y + 3],
    radius=2,
    fill=WHITE_30
)

# ── Task list lines (below divider) ─────────────────────────────
line_y_start = 545
line_spacing = 85
margin_x = 172

for i in range(4):
    y = line_y_start + i * line_spacing
    # Small checkbox square
    cb_size = 28
    opacity = WHITE_70 if i < 2 else WHITE_30
    draw.rounded_rectangle(
        [margin_x, y - cb_size // 2, margin_x + cb_size, y + cb_size // 2],
        radius=6,
        fill=None,
        outline=opacity,
        width=3
    )
    # Line
    lengths = [0.88, 0.65, 0.78, 0.50]
    end_x = margin_x + 52 + int((SIZE - margin_x * 2 - 52) * lengths[i])
    draw.rounded_rectangle(
        [margin_x + 48, y - 5, end_x, y + 5],
        radius=5,
        fill=opacity
    )

# ── Save ─────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUT), exist_ok=True)
img.save(OUT, 'PNG')
print(f"Icon saved: {OUT} ({SIZE}x{SIZE})")
