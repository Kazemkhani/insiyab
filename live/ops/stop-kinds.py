"""Read only public stop-kind attributes; conflicting or missing kinds stay unknown."""
import csv
import json
import sys
kinds={}
with open(sys.argv[1]) as source:
    for row in csv.DictReader(source):
        kind=row['stop_kind'] if row['stop_kind'] in ('pole','ac_shelter') else ''
        for key in (row['stop_id'], row['older_stop_id']):
            if key:
                kinds.setdefault(key,set()).add(kind)
print(json.dumps({key:next(iter(values)) if len(values)==1 else '' for key,values in kinds.items()}))
