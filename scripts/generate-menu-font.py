# Original geometric 5x7 uppercase lettering for the procedural cafe menu.
import struct, math
from pathlib import Path
patterns = {
'A':['01110','10001','10001','11111','10001','10001','10001'],
'C':['01111','10000','10000','10000','10000','10000','01111'],
'E':['11111','10000','10000','11110','10000','10000','11111'],
'F':['11111','10000','10000','11110','10000','10000','10000'],
'G':['01111','10000','10000','10111','10001','10001','01110'],
'H':['10001','10001','10001','11111','10001','10001','10001'],
'I':['11111','00100','00100','00100','00100','00100','11111'],
'L':['10000','10000','10000','10000','10000','10000','11111'],
'M':['10001','11011','10101','10101','10001','10001','10001'],
'N':['10001','11001','11001','10101','10011','10011','10001'],
'O':['01110','10001','10001','10001','10001','10001','01110'],
'P':['11110','10001','10001','11110','10000','10000','10000'],
'R':['11110','10001','10001','11110','10100','10010','10001'],
'S':['01111','10000','10000','01110','00001','00001','11110'],
'T':['11111','00100','00100','00100','00100','00100','00100'],
'U':['10001','10001','10001','10001','10001','10001','01110'],
'Y':['10001','10001','01010','00100','00100','00100','00100']}
U=lambda *v: struct.pack('>'+'H'*len(v),*v)
S=lambda *v: struct.pack('>'+'h'*len(v),*v)
L=lambda *v: struct.pack('>'+'I'*len(v),*v)
chars=[32]+sorted(map(ord,patterns))
glyphs=[b'']
for char in chars:
    pts=[]
    for row,line in enumerate(patterns.get(chr(char),[])):
        for col,bit in enumerate(line):
            if bit=='1':
                x,y=col*100, (6-row)*100
                pts.extend([(x,y),(x,y+85),(x+85,y+85),(x+85,y)])
    if not pts:
        glyphs.append(b''); continue
    n=len(pts)//4
    data=S(n,0,0,485,685)+U(*[i*4+3 for i in range(n)])+U(0)+bytes([1]*len(pts))
    px=py=0
    for x,y in pts: data+=S(x-px); px=x
    for x,y in pts: data+=S(y-py); py=y
    glyphs.append(data+b'\0'*(-len(data)%4))
loc=[0]
for g in glyphs: loc.append(loc[-1]+len(g))
num=len(glyphs)
head=L(0x10000,0x10000,0,0x5f0f3cf5)+U(3,1000)+bytes(16)+S(0,0,500,700)+U(0,8)+S(2,1,0)
hhea=L(0x10000)+S(800,-200,0)+U(600)+S(0,0,500,1,0,0)+bytes(8)+S(0)+U(num)
maxp=L(0x10000)+U(num,140,35,0,0,2,0,0,0,0,0,0,0,0)
segments=[(c,c,i+1) for i,c in enumerate(chars)]+[(65535,65535,0)]
seg=len(segments); power=2**int(math.log2(seg))
sub=U(4,16+8*seg,0,seg*2,power*2,int(math.log2(power)),seg*2-power*2)
sub+=U(*[b for a,b,i in segments])+U(0)+U(*[a for a,b,i in segments])+U(*[(i-a)%65536 for a,b,i in segments])+U(*([0]*seg))
cmap=U(0,1,3,1)+L(12)+sub
name='Cafe Grid Original'.encode('utf-16-be')
names=U(0,1,18)+U(3,1,0x409,1,len(name),0)+name
tables={'head':head,'hhea':hhea,'maxp':maxp,'hmtx':b''.join(U(600,0) for g in glyphs),'loca':L(*loc),'glyf':b''.join(glyphs),'cmap':cmap,'name':names,'post':L(0x30000)+bytes(28)}
def checksum(data):
    data+=bytes(-len(data)%4)
    return sum(struct.unpack('>'+'I'*(len(data)//4),data))%2**32
n=len(tables); p=2**int(math.log2(n)); offset=12+16*n
header=L(0x10000)+U(n,p*16,int(math.log2(p)),n*16-p*16); directory=b''; payload=b''; offsets={}
for tag,data in sorted(tables.items()):
    offsets[tag]=offset
    directory+=tag.encode()+L(checksum(data),offset,len(data))
    padded=data+bytes(-len(data)%4); payload+=padded; offset+=len(padded)
font=bytearray(header+directory+payload)
struct.pack_into('>I',font,offsets['head']+8,(0xb1b0afba-checksum(bytes(font)))%2**32)
Path(__file__).with_name('cafe-grid.ttf').write_bytes(font)
