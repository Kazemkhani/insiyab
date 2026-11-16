import json,urllib.request,sys
ds=sys.argv[1]; out=[]; page=1
while True:
    u=f"https://data.dubai/o/dda/data-services/dataset-download?datasetId={ds}&page={page}&pageSize=100&sortDir=desc"
    r=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0','Content-Type':'application/json'})
    j=json.load(urllib.request.urlopen(r,timeout=90))
    d=j.get('data') or {}
    for m in d.get('metadata',[]):
        out.append({'folder':m['file_folder'],'files':[(f['file_name'],f['file_size']) for f in m['files']]})
    p=d.get('pagination') or j.get('pagination') or {}
    if page==1: print('pagination',p, {k:v for k,v in d.items() if k not in('metadata',)} if len(d)<6 else list(d))
    if not p.get('has_more'): break
    page+=1
json.dump(out,open(f'files_{ds}.json','w'))
print(len(out),'folders')
for o in out[:6]+out[-6:]: print(o)
