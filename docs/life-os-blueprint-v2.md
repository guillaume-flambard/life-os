# Life OS — Blueprint v2 : le life coach *spec-driven* (repositionné)

> **Ce document remplace `life-os-blueprint.md` (v1).** La v1 décrivait un journal de décisions ancré psycho. Le concept réel est plus original : **un life coach dont le moteur applique la logique du spec-driven development (OpenSpec) et de l'agentique-agile (BMAD Method) à la vie d'une personne.** La psychologie reste le *contenu* ; OpenSpec/BMAD deviennent l'*architecture du moteur*.
>
> Compagnons : `life-os-axes-psycho.md` (cadres psycho), `life-os-blueprint.md` (v1, archivé pour référence).

---

## 0. Le produit en une phrase

> **Git pour ta vie : tu écris tes valeurs comme des specs testables, tu traites chaque décision comme une *change proposal*, et une équipe d'agents t'aide à vivre conforme à ce que tu as écrit — local-first, open source, à toi seul.**

Version moins jargon (pour le grand public) : *« Le coach qui traite ta vie comme un système versionné : des engagements testables, des décisions traçables, des revues qui vérifient que tu vis ce que tu as écrit. »*

---

## 1. L'idée, précisément

La plupart des outils de vie gèrent **l'exécution** (tâches, cadence : Personal Kanban, OKR perso, Sunsama) ou stockent des **valeurs inertes** (Personal README, journaling). Aucun ne tient une **spec vivante et *testable* de la vie**, contre laquelle on mesure ses décisions et ses semaines.

Le cœur emprunte deux mécaniques éprouvées du dev :

- **OpenSpec = la colonne vertébrale de données.** Ta vie a une `specs/` — la vérité du présent, par domaine. Chaque décision est un dossier `changes/` avec un **delta** (ADDED / MODIFIED / REMOVED) sur cette spec. Les intentions sont écrites en **Requirement + Scénario GIVEN/WHEN/THEN**, donc *falsifiables*. Cycle : proposer → revoir → appliquer → archiver (le delta fusionne dans la spec).
- **BMAD = la distribution des rôles conversationnels.** Le coach joue des personas qui se passent le relais : Analyst (explorer) → PM (cadrer valeurs/buts) → Architect (stratégie) → Scrum Master (découper en « stories » = prochaines actions auto-suffisantes) → Dev (toi, qui exécutes) → QA (la revue).

La combinaison — *spec vivante testable + décision-comme-delta + revue-comme-QA + rôles d'agents, en local-first open source* — **n'a aucun équivalent nommé** d'après la recherche.

---

## 2. Marché & positionnement

Chaque brique existe séparément, dans des univers différents :

| Univers | Exemples | Ce qu'ils ont | Ce qui manque |
|---|---|---|---|
| Vie « agile » | Personal Scrum, Personal Kanban, OKR perso | Backlog, sprints, cadence | Aucune *spec* : gèrent l'exécution, pas les exigences |
| Vie « as a product/code » | *Life as a Product*, *Engineer Your Life*, Personal README | La métaphore, l'inspiration | Essais/analogies, pas d'outil ni de spec vivante |
| Life OS / planif+revue | Notion Life OS, Sunsama, Amazing Marvin, **Complice** | Objectifs → action, rituels de revue | Revue = « ai-je fait mes tâches », pas « ai-je vécu ma spec » |
| Coach IA | Rocky.ai, apps LLM | Conversation, prompts | Cloud, pas de modèle de données de vie, pas local-first |
| Self agentique | **Second Me** (OSS, local-first), AI second brain | Jumeau numérique, mémoire, local-first | Pas de spec à delta ni de boucle QA |
| Méthodo source | OpenSpec, BMAD | La mécanique exacte | 100 % logiciel, jamais transposé à la vie |

**Le gap (les 4 briques réunies) :** (1) une spec de vie *vivante et testable* ; (2) la décision comme *change proposal à delta* ; (3) la revue comme *QA de conformité* ; (4) un cycle *multi-rôles* en *local-first / OSS*. Concurrent le plus proche conceptuellement : **Complice**. Le plus proche techniquement : **Second Me**. Ni l'un ni l'autre n'a la spec-à-delta ni la QA.

**Phrase de positionnement :** voir §0.

---

## 3. Force différenciante *et* piège — l'analyse honnête

C'est une arme **et** un mur, et il faut le regarder en face.

**Ce qui résonne fort (pour ton ICP exact — dev senior/CTO) :** la spec-driven life est immédiatement *legible* pour qui vit dans Git/PR/CI. Elle offre ce que le coaching classique ne donne jamais : **traçabilité des décisions, réversibilité, versioning de soi, tests de conformité**. Le GIVEN/WHEN/THEN transforme « être présent pour mon frère » en scénario vérifiable. Le change-proposal-à-delta répond à une vraie douleur : *« pourquoi ai-je changé d'avis, et à quel coût ? »*.

**Le piège, à trois têtes :** (a) **rigidité perçue** — la vie n'est pas déterministe ; « tester » ses relations peut sembler froid ; (b) **overhead** — écrire des specs demande une discipline que peu tiennent (reproche n°1 du Personal Scrum) ; (c) **TAM étroit** — le vocabulaire (spec, delta, sharding, QA) exclut d'emblée 99 % des chercheurs de « life coach ».

**Décisions de positionnement qui en découlent :**
- **Assumer la niche geek comme un fossé, pas un handicap.** Tes deux premiers users sont exactement l'ICP. Ne dilue pas.
- **Double vocabulaire dès le pitch** : mode expert (spec/delta/QA) et mode humain (« qu'est-ce qui compte cette semaine ? »). Le moteur est spec-driven ; l'UX ne force personne à écrire du Gherkin — **les agents génèrent la spec, l'humain valide.**
- **Se positionner *contre* le life coaching** (« l'anti-coach pour ceux qui pensent en systèmes ») plutôt que dedans — sinon tu es jugé au mauvais barème (soft/spirituel).
- **Poser une posture anti-optimisation-toxique explicite** (voir §7). Le récit « optimise ta vie comme du code » est déjà critiqué ; il faut le désamorcer, pas l'incarner.

---

## 4. Le mapping BMAD + OpenSpec → la vie

**Recommandation d'architecture : OpenSpec comme colonne vertébrale de *données*, BMAD comme distribution de *rôles* conversationnels, et la légèreté OpenSpec (« enablers, not gates ») comme garde-fou sacré contre la lourdeur BMAD.**

| Élément source | Transposition « vie » | Fonction |
|---|---|---|
| `specs/` (vérité du présent) | **Life-Spec** par domaine (`relations/`, `santé/`, `travail/`…) | Décrit ce qui EST, en comportement observable, sans jugement |
| Requirement + Scénario GWT | Valeur/engagement + scénario de preuve | Rend l'intention testable |
| RFC 2119 (MUST/SHOULD/MAY) | Priorité de l'engagement (non-négociable / souhaité / optionnel) | Distingue limite dure et nice-to-have |
| `changes/` (1 dossier = 1 proposition) | **Change proposal de décision** (« changer de job », « arrêter X ») | Isole une décision, la met en revue avant de toucher la spec |
| `proposal.md` | Le *pourquoi* | Expliciter la motivation |
| `design.md` | Le *plan / la stratégie* | Le comment avant d'agir |
| deltas ADDED/MODIFIED/REMOVED | **Ce qui change dans ma vie** | Diff sémantique clair |
| `tasks.md` | Actions cochables | Micro-exécution |
| archive (fusion du delta) | **Intégration** : la décision devient le nouveau normal | Met à jour la vérité du présent |
| Analyst | Coach d'exploration | Écoute, clarifie (le « Reality » de GROW) |
| PM | Coach de cadrage | Valeurs → buts, découpe en domaines |
| Architect | Coach de stratégie | Contraintes, plan conditionnel |
| Scrum Master + sharding | Coach de mise en action | Fabrique la **story = prochaine action auto-contenue** (avec son contexte) |
| Dev | Toi | Exécutes une action à la fois |
| QA + boucle | **Revue / rétrospective** | « Ai-je vécu ma spec ? » — bienveillant, pas tribunal |

**Ce qui se transpose bien :** la séparation *vérité présente (specs) vs proposition de changement (changes)* ; le GWT qui rend les objectifs falsifiables ; le **sharding en stories auto-contenues** (le meilleur emprunt : casse la friction de démarrage) ; le RFC 2119 pour arbitrer valeurs vs préférences ; le cycle propose→review→apply→archive comme boucle d'habitude saine.

**Ce qui NE se transpose PAS (où la métaphore casse — à cadrer dans le produit) :**
- **La personne n'est pas déterministe.** Un delta « mergé » ne « prend » pas parce qu'on l'a écrit (émotions, ambivalence, résistances).
- **Le vécu intérieur EST l'objet**, pas un détail d'implémentation à cacher (OpenSpec exclut l'implémentation ; en vie, le sens/ressenti compte).
- **Dev = QA = la même personne.** Pas de séparation des rôles réelle → risque d'auto-complaisance ou d'auto-flagellation.
- **Pas de « definition of done » nette.** Un objectif de vie est graduel, réversible, jamais vraiment « archivé ».
- **La QA adversariale du dev doit devenir compassionnelle** — sinon elle nourrit la critique interne.

---

## 5. L'IA : des rôles-lentilles, pas un théâtre multi-agents

La recherche 2025-2026 est claire : le **débat multi-agents n'améliore pas de façon fiable** un bon agent unique bien prompté, et le dispositif « Multi-Persona » est souvent le **pire** (pression de la majorité, persuasion par l'éloquent-mais-faux, chambres d'écho). Conséquence de design :

- **Les rôles sont des lentilles / checklists séquentielles**, pas des voix qui débattent. Chaque rôle garantit qu'*une bonne question structurellement différente* est posée (explorer ≠ planifier ≠ critiquer). Un seul modèle qui adopte ces cadres l'un après l'autre > un « society of mind » bruyant (et bien moins de tokens/latence).
- **Ancrage validé côté humain :** l'**entretien motivationnel** (corpus solide) pour l'Analyst ; le **roleplay** réservé à l'entraînement de compétences, pas à la délibération interne.

**Stack IA (inchangée depuis v1, toujours valide) :** local-first — Qwen3.5 ~9B ou Gemma 3/4 12B via MLX/Ollama ; petit modèle utilitaire (Gemma E2B, JSON natif) pour produire les deltas/scénarios structurés ; fallback cloud opt-in *anonymisé* seulement. Mémoire = SQLite + sqlite-vec chiffrés, embeddings 100 % locaux (un embedding n'est pas anonyme).

---

## 6. Le mapping psychologie → rôles (avec niveau de preuve honnête)

| Rôle / artefact | Cadre | Validité |
|---|---|---|
| Analyst (life-spec, entretien) | Entretien motivationnel + GROW-Reality | MI **solide** ; GROW **modéré/faible** |
| PM (valeurs → engagements) | Clarification valeurs ACT + SDT (motivation autonome) + Locke&Latham | ACT **modéré-solide** ; SDT **solide** ; Locke&Latham **solide** *pour des tâches* |
| Architect (objectif → plan conditionnel) | WOOP / contraste mental + intentions d'implémentation (si-alors) | **Solide** (parmi les mieux étayés) |
| Scrum Master (découpage, cadence) | Fogg / Tiny Habits (B=MAP) | **émergent/modéré** |
| Dev (exécution) | Auto-efficacité (Bandura) + feedback SDT | **solide** conceptuellement |
| QA (revue vs spec) | Écriture expressive + decision journal + auto-compassion | auto-compassion **solide** ; écriture **modéré** |
| deltas / changement | Modèle transthéorique (stades) | **contesté** — heuristique de tact seulement |

Deux avertissements : **Locke & Latham marche pour des tâches, mal pour des domaines de vie flous** (un but « spécifique et difficile » sur « être un bon parent » devient vite une métrique perverse). Et **le TTM est le maillon faible** — ne le rends pas central ; le vrai moteur, c'est MI + valeurs-ACT + SDT + WOOP/si-alors + auto-compassion.

---

## 7. Le risque central : trop systématiser sa vie

C'est **le** danger du concept, et il est documenté. À traiter comme une exigence produit de premier ordre.

- **Loi de Goodhart** : « quand une mesure devient une cible, elle cesse d'être une bonne mesure ». Tu optimises le proxy (heures « focus ») et corrodes la chose réelle (travail profond).
- **Coût de la quantification (Etkin, 2016)** : mesurer une activité augmente le volume mais **réduit le plaisir intrinsèque et la motivation** — ça transforme en corvée ce qu'on aimait.
- **Culture de l'optimisation & burnout** : l'auto-optimisation permanente est anxiogène et épuise le plus ceux qui s'y donnent le plus.
- **Rigidité vs flexibilité** : la santé psychologique corrèle avec la *flexibilité* ; une vie sur-spécifiée pousse structurellement vers la rigidité.

**Principes de design anti-sur-systématisation (à graver dans le produit) :**

1. **Peu de specs, choisies.** Plafonner : 3-5 domaines actifs, ~3 engagements max. La friction doit *augmenter* avec la quantité de structure.
2. **Valeurs oui, métriques non par défaut.** La spec décrit des comportements sous condition (WOOP), pas des KPIs. Quantification opt-in et rare ; ne jamais chiffrer ce qui doit rester aimé (relations, repos, loisir).
3. **Anti-Goodhart intégré.** Jamais un seul chiffre-cible ; apparier chaque proxy à un contre-indicateur qualitatif ; faire *expirer* les métriques ; la QA demande « cette mesure me fait-elle tricher ? ».
4. **Slack & spontanéité en first-class.** Zones « no-spec » explicites, jours off. Le coach doit pouvoir dire « ne planifie pas ça ».
5. **Le système se dissout quand ça va.** Succès = *moins* de coach (habitude autonome, SDT), pas plus. On retire l'échafaudage.
6. **QA compatissante, pas tribunal.** Auto-compassion + séparation décision/résultat (anti biais de résultat) ; bannir le langage de dette/échec.
7. **Léger par contrat.** Interactions courtes, langage humain dans l'UX même si le moteur est spec-driven.
8. **Rôles = lentilles, pas débat** (cf. §5).

---

## 8. Technique, licence, business, GTM (repris de v1 — inchangés)

- **Archi** : Tauri v2 + SQLite (SQLCipher) + sqlite-vec + FTS5 + Ollama ; pas de sync engine au MVP (fichier chiffré via Tailscale/Syncthing) ; libSQL replicas en V2 ; CRDT (Loro) seulement si édition concurrente réelle. `events` append-only + soft-deletes + UUID dès j1.
- **Données** : l'objet central reste la **Décision** (= le change proposal), relié à Value, Story, Review, IfThenPlan, MemoryChunk. La Life-Spec est le corpus de Requirements/Scénarios par domaine.
- **Licence** : cœur **AGPL-3.0 + CLA** ; module serveur de sync éventuel en BSL/Elastic-2.0.
- **Monétisation** : logiciel local gratuit ; payant = **sync/backup E2E** + licence pro (playbook Obsidian/Ente). Jamais les données ni les insights.
- **Tension à assumer** : local-first = fort sur la privacy, mais **pas d'effet réseau ni de coaching social** → frein potentiel à la rétention/monétisation. À arbitrer tôt.
- **GTM** : founder story + dogfooding public → r/selfhosted & r/privacy → Show HN (« local-first, spec-driven life coach, no cloud ») → Product Hunt. Défendre **la méthodologie comme marque** (pas juste la techno) : si un self agentique ajoute « valeurs+objectifs », ton delta se réduit à la méthode spec/QA.

---

## 9. Éthique & garde-fous (inchangés, non négociables dès v1 de la spec)

« Pas un thérapeute » visible ; détection de détresse → sortie du flux + ressources locales ; décisions à fort enjeu (santé/argent/juridique) → orienter vers un pro ; anti-dark-patterns ; RGPD art. 9 (local-first aide : minimisation, E2E, export/effacement natifs) ; anti-sycophancie, zéro affirmation perso non sourcée.

---

## 10. Roadmap repositionnée — MVP « Decision-as-Change-Proposal »

**Phase 1 — MVP (valider la thèse sur toi + ton frère).** Le plus petit système qui prouve le concept :
- **Life-Spec minimale** : 3 domaines, engagements en GIVEN/WHEN/THEN (générés par l'agent, validés par toi).
- **Une décision comme change proposal** : l'agent (rôles Analyst→PM→Architect en lentilles) produit proposal + delta (ADDED/MODIFIED/REMOVED) + 1 story auto-contenue. Sortie JSON structurée obligatoire.
- **La revue = QA** : « as-tu vécu tes scénarios cette semaine ? », compassionnelle, met à jour la spec (archive du delta).
- **Mémoire** locale des décisions + rappel + relecture d'issue.
- **Garde-fous anti-sur-systématisation intégrés** : plafond de domaines/engagements, zones no-spec, langage humain.
- Local-first, sans sync, Tauri+SQLite+Ollama.

*Critère de réussite :* toi et ton frère utilisez le cycle 4 semaines, et chacun peut montrer une décision passée en change-proposal + sa revue.

**Phase 2 — V1 :** boucle quotidienne légère, sync E2E multi-device, sortie OSS (AGPL+CLA), Show HN.
**Phase 3 — V2 :** sync hébergé payant, plus de domaines, stories récurrentes — *toujours* sous le plafond anti-lourdeur.

**Différé :** calendrier, finances, santé, multi-utilisateur, toute métrique quantifiée non essentielle.

---

## 11. Prochaines actions

1. **Valider le repositionnement** (§0-§4) : la métaphore « Git pour ta vie » te va, ou on ajuste le curseur jargon ?
2. **Définir ta Life-Spec de départ** : 3 domaines + 2-3 Requirements chacun en GIVEN/WHEN/THEN (on peut le faire ensemble, à la main, en 20 min — c'est le meilleur test du concept).
3. **Jouer une vraie décision en change-proposal** de bout en bout (proposal → delta → story → revue), sur un choix que tu as en ce moment.
4. Puis seulement : scaffolder dans Claude Code (BMAD pour les rôles, OpenSpec pour les artefacts).

> Reco : actions 2 et 3 d'abord, sur du réel. Si le cycle « écrire un scénario → le vivre → le QA » te procure de la clarté sur *toi*, le concept est validé. Sinon, on l'apprend en 40 minutes plutôt qu'après 3 mois de code.
