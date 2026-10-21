"""Builds one timer page per week from the master's Day 4 rows (day4.json).
Usage: python3 generate.py  → writes ../immortals/week-N/index.html and ../immortals/index.html"""
import json, re, os, html
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
TEAM, SLUG = 'Immortals', 'immortals'
data = json.load(open(os.path.join(HERE, 'day4.json')), object_pairs_hook=OrderedDict)

MONTHS = {'January': 'Jan', 'February': 'Feb', 'March': 'Mar', 'April': 'Apr', 'May': 'May', 'June': 'Jun',
          'July': 'Jul', 'August': 'Aug', 'September': 'Sep', 'October': 'Oct', 'November': 'Nov', 'December': 'Dec'}

def secs(v):
    m = re.search(r'(\d+)\s*s', v or '')
    return int(m.group(1)) if m else 0

def week_num(title):
    return int(re.match(r'Week (\d+)', title).group(1))

def parse(title, wk):
    rows = wk['day4']
    summary = (rows[0][3] if len(rows[0]) > 3 else '').strip()
    summary = re.sub(r'^▶ Timer\s*·\s*', '', summary)
    header = rows[1]
    items = []
    for r in rows[2:]:
        r = r + [''] * (10 - len(r))
        if not r[0].strip():
            continue
        items.append({'code': r[2].strip(), 'name': r[0].strip(), 'F': r[5], 'G': r[6].strip(), 'H': r[7].strip(), 'note': r[8].strip()})
    s = summary.lower()
    # group by letter (pods) or one group (numbered stations)
    groups = OrderedDict()
    for it in items:
        key = it['code'][0] if it['code'][:1].isalpha() else '#'
        groups.setdefault(key, []).append(it)

    def note_clean(n):
        n = re.sub(r'\s*·?\s*(Rest \d+ min → Pod \w|\d+ min → \w\d|Straight to \w\d|Log your rounds)\s*$', '', n)
        return n.strip(' ·')

    def mk_groups(label_fn, rx_fn, meta=None):
        out = []
        for gi, (k, its) in enumerate(groups.items()):
            out.append({'label': label_fn(gi, k), 'meta': meta(gi, its) if meta else '',
                        'items': [{'code': it['code'], 'name': it['name'], 'rx': rx_fn(it), 'note': note_clean(it['note'])} for it in its]})
        return out

    c = {'team': TEAM, 'week': 'Week %d' % week_num(title), 'title': title, 'summary': summary, 'getReady': 10}
    first = items[0]
    if 'amrap' in s:
        mins = int(re.search(r'(\d+)\s*min', first['F']).group(1))
        change = 120 if '2 min between' in s else 60
        c.update(format='amrap', params={'mins': mins, 'change': change},
                 groups=mk_groups(lambda gi, k: 'Pod ' + k, lambda it: it['G'], lambda gi, its: '%d-min AMRAP · log your rounds' % mins),
                 startText='Go to your first pod', firstWhere='Pod 1 of %d' % len(groups),
                 howTo='Each group starts at a different pod and cycles its 4 exercises for the full time.')
    elif 'emom' in s:
        mins = int(re.search(r'(\d+)\s*min', first['F']).group(1))
        change = 60
        c.update(format='emom', params={'mins': mins, 'change': change},
                 groups=mk_groups(lambda gi, k: 'Pod ' + k, lambda it: it['G'], lambda gi, its: 'EMOM %d min · one exercise per minute' % mins),
                 startText='Go to your first pod', firstWhere='Pod 1 of %d · Minute 1 of %d' % (len(groups), mins),
                 howTo='At each "Start", do the next exercise\'s reps, then rest for the rest of the minute.')
    elif 'tabata' in s:
        mb = re.search(r'(\d+)s between', s); mm = re.search(r'(\d+) min between', s)
        between = int(mb.group(1)) if mb else int(mm.group(1)) * 60 if mm else 60
        c.update(format='tabata', params={'rounds': 8, 'work': 20, 'rest': 10, 'between': between},
                 groups=mk_groups(lambda gi, k: 'Tabata ' + k, lambda it: '', lambda gi, its: '8 × 20s on / 10s off, alternating the two'),
                 startText='Go to your first Tabata', firstWhere='Tabata 1 of %d · Round 1 of 8' % len(groups),
                 howTo='Alternate the two exercises each round. %ds between Tabatas.' % between)
    elif 'race piece' in s:
        c.update(format='race', params={'rounds': 3, 'block': 30, 'rest': 90},
                 groups=mk_groups(lambda gi, k: 'Piece ' + k, lambda it: '', lambda gi, its: '4 × 30s straight, 90s rest · 3 rounds'),
                 startText='Go to your first piece', firstWhere='Piece 1 of %d · Round 1 of 3' % len(groups),
                 howTo='2 minutes straight: switch exercises every 30s at the cue, no rest until the end.')
    elif 'complex' in s:
        rounds = int(re.search(r'(\d+)\s*rounds', s).group(1))
        rest = secs(groups[list(groups)[0]][-1]['H'])
        c.update(format='manual', params={'rounds': rounds, 'rest': rest, 'unit': 'Complex', 'workText': 'Do the complex'},
                 groups=mk_groups(lambda gi, k: 'Complex ' + k, lambda it: it['G'], lambda gi, its: "%d rounds · don't set the dbs down · %ds rest" % (rounds, rest)),
                 startText='Go to your first complex', firstWhere='Complex 1 of %d · Round 1 of %d' % (len(groups), rounds),
                 howTo='The timer waits while you work: tap "Rest" when the group finishes the round, and it counts the rest down.')
    elif 'contrast' in s or 'heavy supersets' in s:
        rounds = int(first['F']) if first['F'].strip().isdigit() else 3
        rest = secs(groups[list(groups)[0]][-1]['H'])
        unit = 'Pair'
        c.update(format='manual', params={'rounds': rounds, 'rest': rest, 'unit': unit, 'workText': 'Do both exercises'},
                 groups=mk_groups(lambda gi, k: 'Pair ' + k, lambda it: it['G'], lambda gi, its: '%d rounds · %ds rest' % (rounds, rest)),
                 startText='Go to your first pair', firstWhere='Pair 1 of %d · Round 1 of %d' % (len(groups), rounds),
                 howTo='The timer waits while you work: tap "Rest" when the group finishes both exercises, and it counts the rest down.')
    elif 'supersets' in s:
        rounds = int(first['F'])
        work = secs(first['G'])
        rest = secs(groups[list(groups)[0]][-1]['H'])
        change = 60
        c.update(format='supersets', params={'rounds': rounds, 'work': work, 'rest': rest, 'change': change},
                 groups=mk_groups(lambda gi, k: 'Superset ' + k, lambda it: '', lambda gi, its: '%ds each, back-to-back · %ds rest · %d rounds' % (work, rest, rounds)),
                 startText='Go to your first superset', firstWhere='Superset 1 of %d · Round 1 of %d' % (len(groups), rounds),
                 howTo='Switch to the second exercise at the cue with no rest. 1 min to move to the next superset.')
    elif 'laps' in s:
        laps = int(first['F'])
        ml = re.search(r'(\d+) min between laps', s)
        lap_break = int(ml.group(1)) * 60 if ml else 120
        c.update(format='laps', params={'laps': laps, 'work': secs(first['G']), 'rest': secs(first['H']), 'lapBreak': lap_break},
                 groups=[{'label': 'Stations', 'meta': '%s on / %s off · %d laps · %d min between laps' % (first['G'], first['H'], laps, lap_break // 60),
                          'items': [{'code': it['code'], 'name': it['name'], 'rx': '', 'note': note_clean(it['note'])} for it in items]}],
                 startText='Go to your first station', firstWhere='Lap 1 of %d' % laps,
                 howTo='Each group starts at a different station and rotates after every interval.')
    elif 'per station' in s:
        sets = int(first['F'])
        move = int(re.search(r'(\d+)s to next station', s).group(1))
        c.update(format='stations', params={'sets': sets, 'work': secs(first['G']), 'rest': secs(first['H']), 'move': move},
                 groups=[{'label': 'Stations', 'meta': '%s on / %s off × %d per station · %ds to next station' % (first['G'], first['H'], sets, move),
                          'items': [{'code': it['code'], 'name': it['name'], 'rx': '', 'note': note_clean(it['note'])} for it in items]}],
                 startText='Go to your first station', firstWhere='Station 1 of %d' % len(items),
                 howTo='Do all your sets at a station, then move on at "Next station". Groups start at different stations.')
    else:  # pods of interval work
        rounds = int(first['F'])
        m = re.search(r'(\d+)\s*min between pods', s); m2 = re.search(r'(\d+)s between pods', s)
        change = int(m.group(1)) * 60 if m else int(m2.group(1)) if m2 else 60
        c.update(format='pods', params={'rounds': rounds, 'work': secs(first['G']), 'rest': secs(first['H']), 'change': change},
                 groups=mk_groups(lambda gi, k: 'Pod ' + k, lambda it: '', lambda gi, its: '%d rounds · %s on / %s off' % (rounds, first['G'], first['H'])),
                 startText='Go to your first station', firstWhere='Pod 1 of %d · Round 1 of %d' % (len(groups), rounds),
                 howTo='Each group starts at a different station and rotates after every interval. %s between pods.' % ('%d min' % (change // 60) if change % 60 == 0 else '%ds' % change))
    return c

PAGE = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#16181d">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600&display=swap">
<link rel="stylesheet" href="../../assets/timer.css">
</head>
<body>
<div class="board" id="board" data-phase="idle">
  <div class="top">
    <div class="wk" id="wk">Day 4<small id="sum"></small></div>
    <div class="remain" id="remain"></div>
  </div>
  <div class="main" aria-live="polite">
    <div class="phase" id="phase">Get ready</div>
    <div class="clock" id="clock">0:10</div>
    <div class="now" id="now"></div>
    <div class="next" id="next"></div>
    <div class="where" id="where"></div>
  </div>
  <div style="display:grid;gap:12px">
    <div class="bar"><i id="bar"></i></div>
    <div class="controls">
      <button id="back" aria-label="Back one step">◀◀</button>
      <button id="go" class="primary">Start</button>
      <button id="skip" aria-label="Skip to next step">▶▶</button>
      <button id="reset">Reset</button>
      <button id="sound" aria-label="Change the sound">Martin</button>
    </div>
    <div class="hint" id="hint"></div>
  </div>
</div>
<section class="plan">
  <div class="plan-inner">
    <h2 id="plan-title">Day 4 circuit</h2>
    <p id="plan-desc"></p>
    <div class="groups" id="groups"></div>
  </div>
</section>
<script>window.CIRCUIT = {circuit};</script>
<script src="../../assets/voices.js"></script>
<script src="../../assets/timer.js"></script>
</body>
</html>
'''

INDEX = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#16181d">
<title>{team} Circuit Timers</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600&display=swap">
<link rel="stylesheet" href="../assets/timer.css">
</head>
<body>
<main class="index">
  <h1>{team} · Day 4 circuits</h1>
  <p>Tap a week to open its timer. Each page has the full-screen timer and the circuit underneath.</p>
  <ul class="weeks">
{rows}
  </ul>
</main>
</body>
</html>
'''

def main():
    rows = []
    for title, wk in data.items():
        n = week_num(title)
        c = parse(title, wk)
        d = wk['date'].split()
        c['date'] = (MONTHS.get(d[0], d[0]) + ' ' + d[1]) if len(d) == 2 else wk['date']
        out_dir = os.path.join(SITE, SLUG, 'week-%d' % n)
        os.makedirs(out_dir, exist_ok=True)
        page_title = '%s Week %d · Day 4 Timer' % (TEAM, n)
        with open(os.path.join(out_dir, 'index.html'), 'w') as f:
            f.write(PAGE.format(title=html.escape(page_title), desc=html.escape(c['summary']),
                                circuit=json.dumps(c, ensure_ascii=False).replace('</', '<\\/')))
        label = title.replace('Week %d' % n, '').strip(' -') or ''
        rows.append('    <li><a href="week-%d/"><b>Week %d</b><span>%s</span><time>%s</time></a></li>' % (
            n, n, html.escape(c['summary']), html.escape(c['date'])))
        print('Week %-2d %-10s %s' % (n, c['format'], c['summary']))
    with open(os.path.join(SITE, SLUG, 'index.html'), 'w') as f:
        f.write(INDEX.format(team=TEAM, rows='\n'.join(rows)))

if __name__ == '__main__':
    main()
