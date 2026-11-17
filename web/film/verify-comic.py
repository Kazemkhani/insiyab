"""Check the exported media, retain frames for human review, and test bad input."""
import json,pathlib,subprocess,sys,tempfile,shutil,struct,array,math
site,out,audio=map(lambda x:pathlib.Path(x).resolve(),sys.argv[1:4]);movie=out/'Insiyab-comic.mp4'
def run(args):return subprocess.check_output(args,text=True)
info=json.loads(run(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_name,width,height,sample_rate,duration,nb_frames','-of','json',str(movie)]))
video=next(s for s in info['streams'] if s['codec_name']=='h264');sound=next(s for s in info['streams'] if s['codec_name']=='aac')
assert (video['width'],video['height'],int(video['nb_frames']))==(1920,1080,1800)
assert float(video['duration'])==60 and abs(float(info['format']['duration'])-60)<1/30 and sound['sample_rate']=='48000'
print('PASS film: 1800 frames, 1920x1080, 60-second H.264 video and 48kHz AAC audio')
raw=subprocess.check_output(['ffmpeg','-loglevel','error','-i',str(movie),'-vn','-ac','1','-ar','48000','-f','f32le','-']);samples=array.array('f');samples.frombytes(raw)
peak=max(map(abs,samples));cut=samples[int(29.35*48000):int(29.55*48000)];rms=math.sqrt(sum(x*x for x in cut)/len(cut))
assert peak<1,(peak,'mix exceeds full scale');assert rms<.0001,(rms,'the release beat is not silent')
print(f'PASS film: decoded audio peak {peak:.4f}; silent cut RMS {rms:.8f}; listening quality not assessed')
manifest=json.loads((out/'media/comic.json').read_text());assert manifest['omitted']==[5,6,8,9]
assert all(len(manifest['captions'][str(i)])>0 for i in manifest['omitted'])
print('PASS film: unsupported spoken claims are excluded and have corrected captions')
frames=out/'review';frames.mkdir(exist_ok=True)
for i,t in enumerate([1,9,13.5,17,24,30,36,41,44,48,52,56,59]):
 frame=frames/f'{i:02d}.png';subprocess.run(['ffmpeg','-loglevel','error','-y','-ss',str(t),'-i',str(movie),'-frames:v','1',str(frame)],check=True)
 assert struct.unpack('>II',frame.read_bytes()[16:24])==(1920,1080)
print('PASS film: 13 review frames saved; these must be opened separately')
with tempfile.TemporaryDirectory(prefix='insiyab-film-negative-') as tmp:
 target=pathlib.Path(tmp)/'bad';(target/'data/forecast').mkdir(parents=True)
 for name in ['meta.json','network.json','personas.json','decisions.json','forecast/boardings-route.json','forecast/delay-route.json']:
  shutil.copyfile(site/'data'/name,target/'data'/name)
 p=target/'data/personas.json';data=json.loads(p.read_text());next(p for p in data['personas'] if p['id']=='site_worker')['steps'][0]['before']['load']+=1;p.write_text(json.dumps(data))
 result=subprocess.run(['node','web/film/prepare-comic.mjs',str(target),str(pathlib.Path(tmp)/'out'),str(audio)],capture_output=True,text=True)
 assert result.returncode!=0 and 'do not describe the same load' in result.stderr
print('PASS film: a mismatched worker and vehicle-exchange story is rejected')
(out/'probe.json').write_text(json.dumps(info,indent=2)+'\n')
print('FILM PASS')
