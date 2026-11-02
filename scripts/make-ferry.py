# 강나루 지도(src/proto/maps/ferry.tmj)를 만든다. Tiled에서 손으로 고친 뒤에는 다시 돌리지 않는다(덮어쓴다).
#   python3 scripts/make-ferry.py
import json, re
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
s=open(f'{ROOT}/src/proto/atlas.ts').read()
sec=s[s.index('export const TILES'):s.index('} as const;', s.index('export const TILES'))]
R={m.group(1):list(map(int,m.group(2,3,4,5))) for m in re.finditer(r'(\w+): \[(\d+), (\d+), (\d+), (\d+)\]', sec)}
W,H=24,22
# 땅: . 풀 : 흙길 ~ 물 = 판자
g=[['.']*W for _ in range(H)]
for y in range(H):
    shore = 15 if y < 6 else 14 if y < 14 else 15
    if y in (16,17,18): shore = 16
    for x in range(shore, W): g[y][x]='~'
# 길: 남쪽 어귀에서 북쪽으로, 주막·창고 앞을 지나 나루터로
for y in range(6, H): g[y][6]=':'
for x in range(3, 7): g[7][x]=':'
for x in range(6, 15): g[9][x]=':'; g[10][x]=':'
for y in range(5, 9): g[y][10]=':'
# 판자 나루
for x in range(14, 21):
    for y in (9,10): g[y][x]='='
# 갈대밭 쪽 오솔길
for y in range(11, 18): g[y][11]=':'
for x in range(11, 14): g[17][x]=':'
deco={}
def put(name, x, y):
    tx,ty,tw,th=R[name]
    for r in range(th//16):
        for c in range(tw//16):
            deco[(x+c,y+r)] = (ty//16+r)*16 + tx//16 + c
put('jumak', 2, 4)
put('house_b', 8, 2)
for p in [(12,7),(13,7)]: put('crate', *p)
for p in [(12,12),(13,12),(4,11)]: put('sack', *p)
for p in [(5,4),(7,5)]: put('jar', *p)
put('boat', 21, 8); put('boat', 21, 11); put('boat', 17, 4)
put('straw', 19, 9)
for p in [(14,6),(13,5),(14,13),(13,14),(14,15),(12,15),(15,19),(13,19),(12,18),(10,16),(10,18),(14,20),(9,14)]:
    if g[p[1]][p[0]] == '.': put('reeds', *p)
for p in [(0,0),(0,8),(0,12),(0,16),(2,19),(0,19),(20,20)]:
    if all(g[p[1]+dy][p[0]+dx] == '.' for dx in (0,1) for dy in (0,1) if p[1]+dy < H): put('tree_pine', *p)
for p in [(3,14),(8,18),(4,9)]: put('bush', *p)
put('sign', 7, 19)
# 2026-11-02: 화면 배율을 줄인 뒤 위쪽이 비어 보여, 북쪽(상류)으로 OY줄을 늘린다. 원래 배치는 그대로 아래로 민다
OY=8
g=[['.']*W for _ in range(OY)]+g
deco={(x,y+OY):v for (x,y),v in deco.items()}
H+=OY
for y in range(OY):
    shore = 16 if y < 3 else 15
    for x in range(shore, W): g[y][x]='~'
for p in [(0,0),(2,1),(4,0),(6,2),(8,0),(10,1),(0,3),(12,0)]:
    if all(g[p[1]+dy][p[0]+dx] == '.' and (p[0]+dx,p[1]+dy) not in deco for dx in (0,1) for dy in (0,1)): put('tree_pine' if p[0] % 4 else 'tree_round', *p)
for p in [(14,2),(13,4),(15,6),(14,7),(11,5),(3,6)]:
    if g[p[1]][p[0]] == '.' and p not in deco: put('reeds', *p)
put('boat', 18, 2)
for p in [(6,6),(8,5)]: put('bush', *p)
terrain_id={'.':0, ':':1, '~':5, '=':6}
tdata=[terrain_id[g[y][x]]+1 for y in range(H) for x in range(W)]
ddata=[(deco[(x,y)]+8 if (x,y) in deco else 0) for y in range(H) for x in range(W)]
objs=[]; nid=1
def obj(o):
    global nid
    objs.append({"id":nid, **o}); nid+=1
def point(name, x, y): obj({"name":name,"type":"point","point":True,"x":x*16+8,"y":(y+OY)*16+8,"width":0,"height":0,"rotation":0,"visible":True})
def actor(name, char, x, y, d, hidden=True, light=None):
    props=[{"name":"char","type":"string","value":char},{"name":"dir","type":"int","value":d}]
    if hidden: props.append({"name":"hidden","type":"bool","value":True})
    if light: props.append({"name":"light","type":"string","value":light})
    obj({"name":name,"type":"actor","point":True,"x":x*16+8,"y":(y+OY)*16+8,"width":0,"height":0,"rotation":0,"visible":True,"properties":props})
def light(name, x, y, kind='lamp', r=3.2):
    obj({"name":name,"type":"light","point":True,"x":x*16+8,"y":(y+OY)*16+4,"width":0,"height":0,"rotation":0,"visible":True,
         "properties":[{"name":"kind","type":"string","value":kind},{"name":"radius","type":"float","value":r}]})
point('나루 어귀', 6, 21); point('나루 주막', 3, 7); point('나루터', 13, 10); point('거적 밑', 18, 10); point('갈대밭', 11, 17); point('길목', 6, 12)
actor('jihu', 'namjihu', 4, 7, 2)
actor('wang1', 'thug', 6, 8, 2); actor('wang2', 'thug', 5, 9, 1); actor('wang3', 'pickpocket', 7, 7, 2)
actor('song1', 'thug', 15, 9, 3, light='torch'); actor('song2', 'thug', 16, 10, 3, light='torch')
actor('doksa', 'doksa', 20, 10, 2, light='torch')
actor('inbu', 'worker2', 12, 17, 2)
point('별창 앞', 10, 5)
actor('sol1', 'soldier', 9, 7, 3); actor('sol2', 'soldier', 11, 7, 2); actor('sol3', 'soldier', 11, 5, 2); actor('yunseo3', 'yunseo', 12, 6, 2)
light('주막 등잔', 3, 6); light('나루 등잔', 14, 8, 'lamp', 2.6); light('창고 등잔', 10, 4)
obj({"name":"주막 굴뚝","type":"smoke","point":True,"x":3*16+8,"y":(4+OY)*16,"width":0,"height":0,"rotation":0,"visible":True})
m={"compressionlevel":-1,"height":H,"infinite":False,"layers":[
 {"data":tdata,"height":H,"id":1,"name":"terrain","opacity":1,"type":"tilelayer","visible":True,"width":W,"x":0,"y":0},
 {"data":ddata,"height":H,"id":2,"name":"deco","opacity":1,"type":"tilelayer","visible":True,"width":W,"x":0,"y":0},
 {"draworder":"topdown","id":3,"name":"objects","objects":objs,"opacity":1,"type":"objectgroup","visible":True,"x":0,"y":0}],
 "nextlayerid":4,"nextobjectid":nid,"orientation":"orthogonal",
 "properties":[{"name":"name","type":"string","value":"강나루"},{"name":"bgm","type":"string","value":"home"},{"name":"ambient","type":"string","value":"none"}],
 "renderorder":"right-down","tiledversion":"1.11.2","tileheight":16,
 "tilesets":[{"firstgid":1,"source":"terrain.tsj"},{"firstgid":8,"source":"deco.tsj"}],
 "tilewidth":16,"type":"map","version":"1.10","width":W}
txt=json.dumps(m, ensure_ascii=False, indent=1)
# Tiled처럼 data는 한 줄에 한 행
def rows(arr): return '[\n' + ',\n'.join('    ' + ', '.join(str(v) for v in arr[i*W:(i+1)*W]) for i in range(H)) + '\n   ]'
txt=re.sub(r'"data": \[[^\]]*\]', lambda mm, it=iter([tdata, ddata]): '"data": ' + rows(next(it)), txt)
open(f'{ROOT}/src/proto/maps/ferry.tmj','w').write(txt+'\n')
for y in range(H): print(''.join('D' if (x,y) in deco else g[y][x] for x in range(W)))
