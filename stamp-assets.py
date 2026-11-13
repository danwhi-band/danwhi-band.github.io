"""멤버 사진 주소 뒤에 ?v=<파일 해시> 를 붙인다. 사진을 바꾸면 주소가 바뀌어 폰 캐시에 옛 사진이 남지 않는다.
사진 바꾼 뒤: python -I stamp-assets.py"""
import hashlib, os, re
root = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(root, 'index.html')
s = open(p, encoding='utf-8').read()
def stamp(m):
    rel = m.group(1)
    h = hashlib.sha1(open(os.path.join(root, rel.lstrip('/')), 'rb').read()).hexdigest()[:10]
    return f'src="{rel}?v={h}"'
t, n = re.subn(r'src="(/assets/members/[^"?]+)(?:\?v=[0-9a-f]+)?"', stamp, s)
if not n:
    raise SystemExit('[stamp-assets] 멤버 사진을 못 찾음')
open(p, 'w', encoding='utf-8', newline='').write(t)
print(f'[stamp-assets] {n}개 갱신')
