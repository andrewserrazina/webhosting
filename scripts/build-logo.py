"""
Builds the Northline Digital wordmark as outlined SVG paths (no font
dependency) from the self-hosted Fraunces variable font.

Usage: python3 scripts/build-logo.py
Requires: pip install fonttools brotli
Outputs: src/components/brand/wordmark.json and public/brand/*.svg
"""
import json
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, 'node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2')

def instance(axes):
    f = TTFont(FONT)
    return instantiateVariableFont(f, axes, inplace=False)

def word_path(font, text, x0, size, tracking=0.0):
    upm = font['head'].unitsPerEm
    scale = size / upm
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    hmtx = font['hmtx']
    pen = SVGPathPen(gs, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
    bpen = BoundsPen(gs)
    x = x0
    for ch in text:
        gname = cmap[ord(ch)]
        # Flip Y: font units are y-up, SVG is y-down. Baseline at y=0.
        t = (scale, 0, 0, -scale, x, 0)
        gs[gname].draw(TransformPen(pen, t))
        gs[gname].draw(TransformPen(bpen, t))
        x += hmtx[gname][0] * scale + tracking * size
    return pen.getCommands(), x, bpen.bounds

SIZE = 100
bold = instance({'wght': 600, 'opsz': 72, 'SOFT': 0, 'WONK': 0})
light = instance({'wght': 300, 'opsz': 72, 'SOFT': 0, 'WONK': 0})

north, x_end, b1 = word_path(bold, 'Northline', 0, SIZE, tracking=-0.01)
space = SIZE * 0.24
digital, x_end2, b2 = word_path(light, 'Digital', x_end + space, SIZE, tracking=-0.005)

min_y = min(b1[1], b2[1])
max_y = max(b1[3], b2[3])
width = x_end2
data = {
    'northline': north,
    'digital': digital,
    'viewBox': [0, round(min_y, 2), round(width, 2), round(max_y - min_y, 2)],
}
os.makedirs(os.path.join(ROOT, 'src/components/brand'), exist_ok=True)
with open(os.path.join(ROOT, 'src/components/brand/wordmark.json'), 'w') as fh:
    json.dump(data, fh)

# Geometric brand mark on a 40x40 grid: an "N" whose right stem rises into a
# north-pointing marker — the "north line".
MARK_N = 'M5 8h5.75v25H5zM5 8h5.75L34 33h-5.75zM28.25 13.5H34V33h-5.75z'
MARK_ARROW = 'M31.125 1.5L37 12.5H25.25z'

def lockup_svg(ink, accent, word2):
    vb = data['viewBox']
    # Mark height 40 units -> scale wordmark so cap height aligns with the mark.
    s = 0.33
    wx = 50
    wy = 33
    total_w = wx + vb[2] * s
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w:.1f} 40" role="img" aria-labelledby="t"><title id="t">Northline Digital</title>
<path fill="{ink}" d="{MARK_N}"/><path fill="{accent}" d="{MARK_ARROW}"/>
<g transform="translate({wx} {wy}) scale({s})"><path fill="{ink}" d="{data['northline']}"/><path fill="{word2}" d="{data['digital']}"/></g>
</svg>
'''

out = os.path.join(ROOT, 'public/brand')
os.makedirs(out, exist_ok=True)
with open(os.path.join(out, 'northline-logo.svg'), 'w') as fh:
    fh.write(lockup_svg('#0B1F3A', '#D6AC65', '#0B1F3A'))
with open(os.path.join(out, 'northline-logo-reversed.svg'), 'w') as fh:
    fh.write(lockup_svg('#FAFAF7', '#D6AC65', '#FAFAF7'))
with open(os.path.join(out, 'northline-mark.svg'), 'w') as fh:
    fh.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" role="img" aria-label="Northline Digital"><path fill="#0B1F3A" d="{MARK_N}"/><path fill="#D6AC65" d="{MARK_ARROW}"/></svg>\n')
favicon = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="#0B1F3A"/><g transform="translate(0.5 1) scale(0.95)"><path fill="#FAFAF7" d="{MARK_N}"/><path fill="#D6AC65" d="{MARK_ARROW}"/></g></svg>\n'
with open(os.path.join(ROOT, 'public/favicon.svg'), 'w') as fh:
    fh.write(favicon)
print('wordmark viewBox', data['viewBox'])
