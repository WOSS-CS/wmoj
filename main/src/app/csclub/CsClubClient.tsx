'use client';

export default function CsClubClient() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">White Oaks Computer Science Club</h1>
        <p className="text-sm text-text-muted mt-1">White Oaks Secondary School, Oakville, Ontario</p>
        <hr className="mt-3 border-border" />
      </div>

      <div className="text-sm text-text-muted leading-relaxed space-y-3">
        <p>
          The Computer Science Club is one of the largest and most prestigious clubs at White Oaks
          Secondary School. It runs in two sections, practical and competitive, so that members can
          spend their time on the kind of computer science they actually care about. Some people join
          to build software and others join to compete, and the club is set up so that both groups get
          a real program rather than a watered down version of each.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Practical section</h2>
        <div className="text-sm text-text-muted leading-relaxed space-y-3">
          <p>
            The practical section is about building software and getting it in front of real users.
            Members work across a few different areas depending on what they want to learn.
          </p>
          <p>
            Web development is the core of it. Students start on the front end with React, Next.js, and
            TypeScript, then move to the back end with Python frameworks like Flask and Django. The goal
            is to be comfortable taking a project from an empty folder to a working site, including the
            parts that are easy to skip when you are self-taught, like structuring an application,
            handling its data, and getting it deployed somewhere other people can actually use it.
          </p>
          <p>
            There is also a game development track built around Roblox. Working in Roblox Studio and its
            scripting tools, members design and build playable games and learn how the pieces fit
            together, from level design and game logic through to publishing a finished game that anyone
            can load up and play.
          </p>
          <p>
            The club spends time on artificial intelligence and machine learning as well. This starts
            from the basic question of how a model learns patterns in data and builds toward training
            simple models and seeing how neural networks are put together. It stays hands-on, so members
            come away knowing how these systems actually behave instead of just recognising the
            buzzwords.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">Competitive section</h2>
        <div className="text-sm text-text-muted leading-relaxed space-y-3">
          <p>
            The competitive section trains students for programming contests, with the Canadian
            Computing Competition (CCC) and the USA Computing Olympiad (USACO) as the main targets.
            Those contests reward knowing a set of standard algorithms and being able to reach for the
            right one quickly, so this section runs like a course that builds up that toolkit across the
            school year.
          </p>
          <p>
            The early meetings cover the fundamentals, things like prefix sums, two pointers, binary
            search, and recursion. From there it builds into the techniques that carry most contest
            problems, especially greedy algorithms and dynamic programming. The last part of the year is
            a substantial unit on graph theory, moving from traversals with DFS and BFS up through
            shortest path algorithms like Dijkstra and Bellman-Ford and minimum spanning trees.
          </p>
          <p>
            By the time the year is done, members have run into most of the ideas that show up again and
            again on the CCC, USACO, and contests like them, and they have spent months practicing those
            ideas on real problems instead of only reading about them.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">The WOSS Dual Olympiad</h2>
        <div className="text-sm text-text-muted leading-relaxed space-y-3">
          <p>
            Every year the club runs the WOSS Dual Olympiad, the largest competition held at White Oaks.
            It is organised together with the school&apos;s Math Club and takes place over two days. One
            day is a competitive programming contest and the other is a math contest, so students can
            enter one or both depending on where their strengths are.
          </p>
          <p>
            The programming day runs on WMOJ, the same platform you are reading this on. Hosting it
            ourselves lets the club write its own problems, run the judging, and give competitors the
            same kind of submit and feedback experience they would get at a national contest.
          </p>
        </div>
      </section>
    </div>
  );
}
