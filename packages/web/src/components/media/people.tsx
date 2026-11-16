import React from 'react';
import { plural, t } from '@lingui/core/macro';
import { useSession } from '@/lib/jellyfin/session';
import { personImageUrl } from '@/lib/artwork/urls';
import { href, to } from '@/lib/paths';
import { MediaRow } from './media-row';
import type { BaseItemPerson } from '@/lib/jellyfin/types';
import { CachedImage } from '@/components/cached-image';
import { Anchor } from '@/components/anchor';

const PERSON_WIDTH = 'basis-[6.5rem] sm:basis-[7.5rem]';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : ''))
    .toUpperCase()
    .trim();
}

export function PersonCard({
  person,
  detail,
}: {
  person: BaseItemPerson;
  detail?: string | null;
}) {
  const { client } = useSession();
  const image = personImageUrl(client, person);
  const body = (
    <>
      <div
        data-ui="person-card-image"
        data-focus-frame
        className="relative mx-auto size-20 overflow-hidden rounded-full bg-gray-900 ring-1 ring-white/10 transition group-hover:ring-white/40 sm:size-24"
      >
        {image ? (
          <CachedImage
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-[--muted]">
            {initials(person.Name ?? '?')}
          </span>
        )}
      </div>
      <p
        data-ui="person-card-name"
        className="mt-2 line-clamp-2 text-xs font-medium group-hover:underline"
      >
        {person.Name}
      </p>
      {detail && (
        <p
          data-ui="person-card-role"
          className="line-clamp-2 text-xs text-[--muted]"
        >
          {detail}
        </p>
      )}
    </>
  );
  return person.Id ? (
    <Anchor
      data-ui="person-card"
      href={href(to.person(person.Id))}
      data-focus="own"
      className="group block text-center"
    >
      {body}
    </Anchor>
  ) : (
    <div data-ui="person-card" className="text-center">
      {body}
    </div>
  );
}

export function PeopleRow({
  id,
  title,
  people,
}: {
  id: string;
  title: string;
  people: { person: BaseItemPerson; detail?: string | null }[];
}) {
  return (
    <MediaRow id={id} title={title} shape="square" itemClass={PERSON_WIDTH}>
      {people.map(({ person, detail }) => (
        <PersonCard
          key={person.Id ?? person.Name}
          person={person}
          detail={detail}
        />
      ))}
    </MediaRow>
  );
}

// eslint-disable-next-line lingui/no-unlocalized-strings -- Jellyfin's person kinds
const CAST = new Set(['Actor', 'GuestStar']);

/** The crew's jobs in the order a title's credits read; any other comes after. */
// eslint-disable-next-line lingui/no-unlocalized-strings -- Jellyfin's person kinds
const CREW_ORDER = ['Director', 'Creator', 'Writer', 'Composer', 'Producer'];

/** Names shown for one job, as a show can list dozens of producers. */
const NAMES_PER_JOB = 6;

/** A crew job's heading over `count` people, by the kinds AIOStreams sends; any other shows as the server names it. */
function jobHeading(kind: string, count: number): string {
  switch (kind) {
    case 'Director':
      return plural(count, { one: 'Director', other: 'Directors' });
    case 'Writer':
      return plural(count, { one: 'Writer', other: 'Writers' });
    case 'Producer':
      return plural(count, { one: 'Producer', other: 'Producers' });
    case 'Composer':
      return t({
        comment: 'Heading over who wrote a title’s score',
        message: 'Music',
      });
    case 'Creator':
      return plural(count, { one: 'Creator', other: 'Creators' });
    default:
      return kind;
  }
}

/** A crew member's name, opening their page on the job they did here. */
function CrewName({ person, kind }: { person: BaseItemPerson; kind: string }) {
  return person.Id ? (
    <Anchor
      data-ui="crew-name"
      href={href(to.person(person.Id, kind))}
      className="rounded-sm font-medium text-brand-300 hover:underline"
    >
      {person.Name}
    </Anchor>
  ) : (
    <span data-ui="crew-name" className="font-medium">
      {person.Name}
    </span>
  );
}

/** The crew by job, each name opening that person's work of the kind. */
function Crew({ people }: { people: BaseItemPerson[] }) {
  const jobs = new Map<string, BaseItemPerson[]>();
  for (const person of people) {
    const kind = String(person.Type ?? '');
    if (!kind || !person.Name) continue;
    const list = jobs.get(kind) ?? [];
    const key = person.Id ?? person.Name;
    if (!list.some((p) => (p.Id ?? p.Name) === key)) list.push(person);
    jobs.set(kind, list);
  }
  const rank = (kind: string) => {
    const at = CREW_ORDER.indexOf(kind);
    return at < 0 ? CREW_ORDER.length : at;
  };
  const ordered = [...jobs].sort(([a], [b]) => rank(a) - rank(b));
  if (!ordered.length) return null;
  return (
    <section data-ui="section" data-name="crew" className="space-y-3">
      <h2 data-ui="section-title" className="text-xl font-semibold">
        {t`Crew`}
      </h2>
      <dl
        data-ui="crew"
        className="max-w-3xl divide-y divide-white/10 border-y border-white/10"
      >
        {ordered.map(([kind, list]) => {
          const more = list.length - NAMES_PER_JOB;
          return (
            <div
              key={kind}
              data-ui="crew-job"
              data-name={kind}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <dt className="flex-none font-semibold sm:w-32">
                {jobHeading(kind, list.length)}
              </dt>
              <dd className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                {list.slice(0, NAMES_PER_JOB).map((person, i) => (
                  <React.Fragment key={person.Id ?? person.Name}>
                    {i > 0 && (
                      <span aria-hidden className="text-[--muted]">
                        ·
                      </span>
                    )}
                    <CrewName person={person} kind={kind} />
                  </React.Fragment>
                ))}
                {more > 0 && (
                  <span className="text-sm text-[--muted]">
                    {plural(more, { one: 'and # more', other: 'and # more' })}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/** The cast with their characters, then the crew by job. */
export function CastAndCrew({
  people,
}: {
  people: BaseItemPerson[] | null | undefined;
}) {
  const all = people ?? [];
  const cast = all.filter((p) => CAST.has(String(p.Type)));
  return (
    <>
      <PeopleRow
        id="cast"
        title={t`Cast`}
        people={cast
          .slice(0, 40)
          .map((person) => ({ person, detail: person.Role }))}
      />
      <Crew people={all.filter((p) => !CAST.has(String(p.Type)))} />
    </>
  );
}
