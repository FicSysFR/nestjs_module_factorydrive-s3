# Générer un message de commit

Analyser uniquement les fichiers stagés (`git diff --cached`). Si l'index est
vide, le signaler et s'arrêter.

Appliquer `commit-convention.md` et, s'il est exposé, le skill `commit-message`
de `.agents/skills/` ou `.claude/skills/`.

Restituer le message proposé et le bump SemVer s'il est justifié, puis
exécuter `git commit` avec ce message, sans rien ajouter à l'index. Ne jamais
ajouter de trailer `Co-Authored-By` pour une IA, de signature `Generated with`
ou `Made-with`. Ne jamais exécuter `git push`.
