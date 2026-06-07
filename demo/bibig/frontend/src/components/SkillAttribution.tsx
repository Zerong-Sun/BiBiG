export type BiographySkill = {
  id: string;
  name: string;
  source: string;
};

const DEFAULT_SKILLS: BiographySkill[] = [
  { id: 'how-to-do-biography', name: 'How To Do Biography', source: 'Nigel Hamilton (2008)' },
  { id: 'biography-vsi', name: 'Biography: A Very Short Introduction', source: 'Hermione Lee (2009)' },
  { id: 'footsteps', name: 'Footsteps', source: 'Richard Holmes (1985)' },
];

type SkillAttributionProps = {
  skills?: BiographySkill[];
  className?: string;
};

export default function SkillAttribution({ skills = DEFAULT_SKILLS, className = '' }: SkillAttributionProps) {
  if (skills.length === 0) return null;

  return (
    <p className={`text-xs text-muted ${className}`.trim()}>
      基于{' '}
      {skills.map((skill, index) => (
        <span key={skill.id}>
          {index > 0 && (index === skills.length - 1 ? '、' : '，')}
          <span title={skill.source}>{skill.name}</span>
        </span>
      ))}{' '}
      传记规范生成
    </p>
  );
}

export { DEFAULT_SKILLS };
