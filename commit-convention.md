# Convention de messages de commit

Source de vérité du dépôt pour les messages de commit, lue par les agents IA et
par les générateurs natifs (VS Code, Cursor, GitHub Copilot). Si une convention
existe déjà ailleurs dans le dépôt, y renvoyer depuis ce fichier plutôt que de
la recopier.

## Format

```
type(scope): description
```

- Langue : anglais, sujet et corps.
- Sujet : impératif, minuscule après `:`, sans point final, ≤ 72 caractères.
- Corps : le pourquoi utile seulement, ligne ≤ 100 caractères.
- Pied de page : issues, co-auteurs humains, `BREAKING CHANGE:`.

## Attribution

Un commit n'a que des auteurs humains. Ne jamais ajouter de trailer
`Co-Authored-By` pour une IA, ni de signature `Generated with`/`Made-with`, ni
mentionner autrement l'outil de génération. Retirer ces lignes même si l'outil
les préremplit.

## Types

`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
`chore`, `revert`.

## Scopes

Aucun `scope-enum` outillé (pas de commitlint) ; scopes observés dans
l'historique du dépôt, à réutiliser plutôt qu'à inventer :

| Fichiers touchés | Scope |
| --- | --- |
| `src/**`, `tests/**` | `s3` |
| `.github/workflows/**` | `ci` |
| `package.json` (dépendances de production) | `deps` |
| `package.json` (dépendances de développement) | `deps-dev` |
| `package.json` (version), `changelog/**`, `CHANGELOG.md` | `release` |

## Ruptures

- Sujet : `feat(scope)!: description`.
- Ou pied de page : `BREAKING CHANGE: description`.

## Vérification locale

- Commande ou hook validant les messages : aucun (revue manuelle).
- Longueur maximale du sujet imposée par l'outillage : 72 caractères (convention du dépôt, non outillée).

## Exemples valides

## Anti-exemples
