"""Original neutral 440/554 Hz two-tone ring. Requires ffmpeg, no source media."""
import math
import struct
import subprocess
import tempfile
import wave
from pathlib import Path
rate=44100
with tempfile.TemporaryDirectory() as directory:
    source=Path(directory)/'ring.wav'
    with wave.open(str(source),'wb') as output:
        output.setnchannels(1);output.setsampwidth(2);output.setframerate(rate)
        frames=[]
        for i in range(int(rate*1.6)):
            t=i/rate
            active=(0<=t<.45) or (.65<=t<1.10)
            local=t if t<.65 else t-.65
            envelope=min(1,max(0,local/.025),max(0,(.45-local)/.07)) if active else 0
            sample=.16*envelope*(math.sin(2*math.pi*440*t)+math.sin(2*math.pi*554*t))
            frames.append(struct.pack('<h',round(sample*32767)))
        output.writeframes(b''.join(frames))
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-codec:a','libmp3lame','-b:a','96k','-map_metadata','-1',str(Path(__file__).with_name('ring.mp3'))],check=True)
print('GENERATED original neutral two-tone ring, 1.6 seconds')
