'use client';

export default function AboutClient() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">About</h1>
        <hr className="mt-3 border-border" />
      </div>

      <div className="text-sm text-text-muted leading-relaxed space-y-3">
        <p>
          WMOJ is a modern online judge and competitive programming platform. Founded by the{' '}
          <span className="text-foreground font-medium">White Oaks Computer Science Club</span>,
          it has grown into a major competitive programming platform open to everyone around the world.
        </p>
        <p>
          We host problems from past CCC, CCO, COCI, IOI and JOI competitions, as well as various problems
          from other sources. We also run our own WMOJ Monthly Open Programming Competition (WMOPC) for
          anyone interested in competitive programming.
        </p>
        <p>
          This application is completely <a href="https://github.com/WMOJ" className="text-brand-primary hover:text-brand-secondary transition-colors">open source</a>. Feel free to contribute to the project. 
        </p>
      </div>
    </div>
  );
}
