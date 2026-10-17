import { useProgress, today } from '../state/store';
import { goalWords, perkProgress, updatePerk } from '../state/actions';
import { say } from '../audio/voice';
import { sfx } from '../audio/sfx';
import { useNav } from '../app/nav';
import { LINES } from '../speech/lines';
import { Bar, Confetti, Header, Icon, Pip, useSayOnMount } from '../ui/parts';

/** Real-life prizes. She claims; a grown-up approves in Grown-ups corner. */
export function Treasure() {
  const nav = useNav();
  const p = useProgress();
  const perks = p.perks.map((x) => ({ x, pr: perkProgress(p, x) }));
  const ready = perks.filter(({ x, pr }) => x.status === 'active' && pr.ready);
  useSayOnMount(ready.length ? LINES.treasureReady(ready[0].x.title) : LINES.treasureEmpty);
  return (
    <div className="screen">
      <Confetti run={ready.length > 0} />
      <Header title="Treasure Chest" onBack={nav.back} right={<span style={{ color: 'var(--sun-dark)' }}>{Icon.chest(40)}</span>} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff', borderRadius: 24, padding: '12px 18px' }}>
        <Pip size={60} />
        <div style={{ fontWeight: 800, fontSize: 18 }}>Real prizes for big wins! When you claim one, a grown-up says yes in Grown-ups corner.</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {perks.map(({ x, pr }) => {
          const canClaim = x.status === 'active' && pr.ready;
          return (
            <div key={x.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: canClaim ? '0 0 0 4px var(--sun)' : undefined }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="emoji" style={{ fontSize: 46 }}>{x.emoji}</span>
                <div className="display" style={{ fontSize: 22, lineHeight: 1.1 }}>{x.title}</div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--muted)', fontSize: 15 }}>{goalWords(x.goal)}</div>
              <Bar value={pr.have} max={pr.need} color="var(--sun-dark)" />
              <div style={{ fontWeight: 800, fontSize: 14 }}>{pr.have} of {pr.need}</div>
              {canClaim && (
                <button className="btn btn-sun" onClick={() => { sfx.star(); updatePerk(x.id, (y) => ({ ...y, status: 'claimed', claimedAt: today() })); say(LINES.claimed); }}>Claim it!</button>
              )}
              {x.status === 'claimed' && <div style={{ fontWeight: 800, color: 'var(--purple)' }}>Waiting for a grown-up to say yes</div>}
              {x.status === 'approved' && <div style={{ fontWeight: 800, color: 'var(--green)' }}>Approved! Enjoy!</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
