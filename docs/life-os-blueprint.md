# Life OS — Blueprint produit complet (deep search, 2026)

> Document de fond consolidé, issu d'une recherche approfondie sur 5 dimensions : marché & concurrents, UX & rétention, architecture local-first, IA locale & mémoire, open source / business / éthique. Objectif : couvrir tous les aspects du produit, étape par étape, pour passer du cadrage à la spec.
>
> À lire avec son compagnon : `docs/life-os-axes-psycho.md` (les cadres psychologiques du cœur).

---

## 0. Le produit en une phrase

> **Life OS est le seul journal de décisions open source et local-first qui aide à trancher ses vrais choix de vie en les ancrant dans sa personnalité et ses valeurs (Big Five, Schwartz, ACT, WOOP), puis se souvient de ce qu'on a décidé — et de comment ça a tourné.**

Formules courtes : « Là où une app de journaling t'écoute et où Notion te range, Life OS te fait *trancher* — et souverainement. » / « Le second cerveau qui décide *avec* toi, pas seulement celui qui range. »

---

## 1. Le problème et la thèse

Le problème n'est pas le manque d'outils, c'est le manque de **continuité** et de **méthode de décision**. On accumule des notes, des humeurs, des to-dos — mais rien ne nous aide à *choisir* selon ce qui compte vraiment, ni à *relire* nos décisions passées pour apprendre.

**Thèse centrale :** « savoir ce qu'on veut » et « trancher » ne sont pas deux problèmes séparés. Une bonne décision est une décision *alignée avec des valeurs clarifiées, débiaisée, transformée en plan concret, puis relue à la lumière du résultat*. Les axes psychologiques forment une **chaîne**, et cette chaîne — pas les modules — est le produit :

```
Se connaître → Direction (valeurs) → DÉCIDER → Avancer (plan) → Réfléchir → (retour)
```

L'objet atomique n'est ni la note, ni l'humeur, ni l'habitude : c'est la **Décision**.

---

## 2. Marché & positionnement — la case vide

La recherche concurrentielle est sans appel : le marché se répartit en quatre familles qui touchent chacune un morceau, **aucune ne fait le tout**.

| Catégorie | Exemples | Ce qu'ils font | Pourquoi ça ne résout pas |
|---|---|---|---|
| Conteneurs / second cerveau | Notion « Life OS », Obsidian, Tana, Reflect, Capacities | Rangent notes/tâches/projets | Neutres, sans méthode ni opinion sur *comment décider* ; setup lourd |
| Journaling / coaching IA | **Rosebud**, **Mindsera**, Stoic, Reflectly, Daylio | IA conversationnelle + mémoire, ancrée bien-être | Orientés *ressenti*, pas *arbitrage* ; cloud propriétaire payant |
| AI accountability | Fostera, GoalsWon, Habitica | Suivi d'objectifs, check-ins, mémoire | Poussent à *exécuter* un but déjà fixé, pas à *choisir* ; zéro psycho validée |
| Decision journals | Farnam Street, Decision Journal App, Clarity | « Décision » comme objet + relecture d'issue | Minces, non ancrés psycho, cloud, orientés business |
| Fondations OSS | Anytype, AppFlowy, Khoj, Reor, Logseq | Local-first, IA locale sur tes notes | Moteurs sans domaine : « chat avec tes notes », pas « trancher selon tes valeurs » |

**La case vide = « un decision journal ancré psycho, avec IA + mémoire d'issue, mais souverain et open source ».** Littéralement inoccupée.

**À copier chez les meilleurs :** l'IA-ancrée-dans-un-cadre-nommé + mémoire longitudinale (Rosebud/Mindsera) ; la boucle de relecture d'issue (Farnam Street) ; la souveraineté des données + IA locale comme argument d'adoption (Anytype/Khoj/Reor) ; la mémoire persistante *inspectable* + check-ins (Fostera).

**Erreurs de la catégorie à ne pas répéter :** setup trop lourd (on construit le système au lieu de l'utiliser) ; journaling qui valide sans faire avancer ; streaks culpabilisants ; paywall précoce sur la valeur ; cloud propriétaire sur des données intimes ; frameworks « décoratifs » qui écrasent au lieu de guider.

---

## 3. Le cœur produit : l'objet « Décision » et la boucle

Tout gravite autour de la **Décision**, enrichie par les axes psychologiques (détaillés dans le doc compagnon) :

```
[1] SE CONNAÎTRE   Big Five / VIA               → profil stable (extrait au fil de l'usage, jamais par formulaire)
      │
[2] DIRECTION      Valeurs (ACT + Schwartz)     → boussole priorisée
      │            SDT (autonomie/compét./lien) → test de qualité d'un objectif
      ▼
[3] DÉCIDER ◄─cœur │ GROW (structure)           → une DÉCISION
      │            WRAP + pre-mortem + 10/10/10   + raisonnement enregistré
      │            scoring alignement-valeurs     + critère de succès
      ▼
[4] AVANCER        Objectifs (Locke&Latham)     → 1 plan « si-alors »
      │            WOOP / intentions d'impl.        (prochain petit pas)
      ▼
[5] RÉFLÉCHIR      Écriture expressive           → 1 apprentissage
      │            Auto-compassion, GROW rétro   → mémoire enrichie, profil mis à jour
      └──────────────────────────────────────────────────► retour à [1]
```

**Ce qui rend Life OS unique = le croisement simultané de 4 propriétés** : (1) la Décision comme objet de première classe ; (2) l'ancrage psycho validé *appliqué au choix* ; (3) la mémoire longitudinale + relecture d'issue ; (4) local-first, privacy-first, open source.

---

## 4. UX & rétention — le vrai risque produit

Donnée brutale : ~70 % des utilisateurs d'apps bien-être décrochent en < 100 jours, la chute la plus raide dans les **deux premières semaines**. Une entrée de journal isolée n'a presque aucune valeur perçue.

**Principe de rétention n°1 : la valeur composée doit devenir visible avant que la motivation initiale ne retombe.** On ne parie PAS la rétention sur des streaks/notifications (motivation extrinsèque fragile) mais sur un **capital de mémoire qui s'accumule et se rend visible** — chaque semaine on récolte plus qu'on n'a semé. C'est un moat qui devient *plus dur à abandonner avec le temps*.

**Deux rythmes, deux intentions :**

- **Boucle quotidienne (≤ 90 s — capture, pas réflexion).** Un point d'entrée : « Qu'est-ce qui a bougé aujourd'hui ? » + capture **voix**. 3 micro-tags ACT optionnels (énergie, alignement-valeurs o/n, décision en attente). Jamais de page blanche : toujours un prompt + option « rien de spécial » en un tap. La quotidienne est un *filet à matière première* qui nourrit le hebdo.
- **Rituel hebdo (10-15 min — le cœur).** 1) **Récolte** : l'app rejoue tes captures (mémoire visible d'emblée). 2) **Pattern** : 1-2 observations tirées des tags. 3) **Une décision guidée** via GROW ou WOOP, une à la fois. 4) **Engagement clôturé** : une intention actionnable réinjectée dans la quotidienne suivante.

**Onboarding — un « aha » en < 5 min, sans questionnaire.** Écran 1, une question : « Quelle décision te trotte en tête en ce moment ? » → l'app lance directement un mini-rituel guidé sur CE sujet réel → sortie : reformulation nette de ce que la personne veut + prochaine étape. **La valeur est livrée avant toute inscription** (le local-first aide : pas de compte à créer). Le profil se construit *par extraction*, jamais par formulaire.

**Conversationnel vs structuré : hybride, structure invisible.** L'utilisateur vit un dialogue guidé (une question à la fois, qui *challenge* au lieu de valider) ; la machine suit une machine à états GROW/WOOP invisible qui garantit qu'on atteint une décision, et stocke les réponses de façon *structurée* (champs par étape) pour permettre patterns et rétrospectives.

**Rendre la mémoire gratifiante :** ouverture du hebdo = récolte (jamais page blanche) ; rappels doux « il y a 3 mois tu as décidé X, où en es-tu ? » (redevabilité sans culpabilité) ; rétrospectives trimestrielles (évolution de l'alignement-valeurs, décisions tenues/abandonnées).

**Anti-patterns à bannir :** page blanche ; réflexion lourde au mauvais moment ; surcharge de features ; app qui ne fait que valider (nourrit l'auto-illusion) ; streaks/badges/guilt-notifications ; onboarding-questionnaire. Test d'éthique des notifications : *l'utilisateur regrettera-t-il de l'avoir reçue ?*

---

## 5. Architecture technique — local-first

**Décision de cadrage clé :** mono-utilisateur multi-device ≠ collaboration concurrente. On n'a **pas** besoin de CRDT full-blown pour synchroniser *ses propres* appareils. Le piège n°1 est de sur-architecturer (Automerge/Yjs) alors qu'un seul humain édite rarement deux appareils à la même seconde.

**Stockage :** **SQLite comme source de vérité** (un fichier, embarqué, longévité maximale) + **export Markdown** (grep, git, pérennité). Le corps des décisions/réflexions en Markdown dans une colonne texte, indexé **FTS5** (mot-clé) en parallèle du vectoriel (sémantique). Embeddings : **sqlite-vec** couvre 95 % du besoin (des milliers à dizaines de milliers de chunks — brute-force suffisant, reste un fichier unique chiffrable). pgvector inutile ici.

**Sync (progressif) :** MVP sans sync engine tiers — **fichier chiffré synchronisé par Tailscale/Syncthing** entre tes appareils. V2 : **libSQL/Turso embedded replicas** (on reste 100 % SQLite, self-hostable, offline natif). V3 seulement, si l'édition concurrente devient réelle : CRDT (**Loro** domine les benchmarks 2026, mais écosystème jeune).

**Chiffrement E2E :** passphrase → **Argon2id** → clé maître → clés de données ; **XChaCha20-Poly1305** (libsodium) ; **SQLCipher** pour la DB au repos. Le serveur de sync ne voit que des blobs opaques (c'est ce qui rend le self-host « simple », Docker Compose minimal). **Recovery kit obligatoire dès le MVP** (perte de passphrase = perte totale).

**Cross-platform :** pour un dev JS/TS qui explore Rust, sur macOS, avec IA locale → **Tauri v2** est l'alignement idéal (desktop + mobile iOS/Android désormais, bundles légers, Rust utile pour le pont Ollama/sqlite-vec, un seul codebase). Piège : rendu WebKit à tester. (Electron = rendu homogène mais lourd et pas de mobile ; PWA = zéro install mais pas de LLM local lourd.)

**Modèle de données (esquisse) :**

```
Decision ── M:N ──▶ Value       (decision_values, poids)
Decision ── M:N ──▶ Goal
Decision ── 1:N ──▶ Review       (date, outcome, learnings, score)
Decision ── 1:N ──▶ IfThenPlan   (condition, action, statut)
Decision ── 1:N ──▶ MemoryChunk  (texte, embedding, model_id)

Value      (nom, description, parent_id)     — hiérarchie/priorisation
Goal       (horizon, statut) ── rattaché à Values
MemoryChunk polymorphe (source_type, source_id) → une seule surface RAG
events      append-only (audit + base d'un futur sync)
```

Tout objet : `id (uuid)`, `created_at`, `updated_at`, **`deleted_at` (soft-delete obligatoire pour sync)**. Le champ `Review.outcome` à re-remplir plus tard, c'est ce qui rend la mémoire précieuse.

**Pièges techniques à graver :** sur-architecturer le sync ; migrations de schéma en local-first (versionner, forward-only, idempotent, testé offline) ; changer de modèle d'embedding = re-embedder tout (stocke `model_id` + dimension par chunk) ; taille des LLM locaux (2-8 Go RAM, prévoir fallback) ; soft-delete oublié (ressuscitation de données au sync).

---

## 6. Couche IA — locale d'abord

Le job de l'IA n'est **pas de savoir** mais de *structurer une réflexion (GROW), débiaiser (WRAP/pre-mortem) et se souvenir*. C'est de la reformulation + du questionnement + du rappel — pas du raisonnement de pointe. **Un petit modèle local bien prompté suffit pour ~90 % des tours.**

**Modèles (Mac M4, 2026) :**
- **Principal : Qwen3.5 ~9B (Q4) ou Gemma 3/4 12B** via **MLX** (meilleur débit sur Apple Silicon) ou Ollama. Excellents en dialogue multilingue (coaching FR), suivi d'instructions, tiennent en 6-8 Go (≥24 Go RAM unifiée recommandé).
- **Rapide/utilitaire : Gemma 4 E2B / Qwen3.5 4B** pour extraction structurée, tagging, résumés (function-calling + JSON natif).
- **Fallback cloud (opt-in, jamais par défaut) : Claude / GPT-5-class**, réservé aux moments à fort enjeu (pre-mortem complexe, détection fine de contradictions sur long historique). Déclencheur **explicite** (bouton « réfléchir plus fort »), **anonymisation avant egress** (jetons `[PERSONNE_1]`, `[EMPLOYEUR]` réhydratés localement), payload minimal, journal d'egress consultable.

**Architecture mémoire :** séparer **épisodique** (sessions, décisions, résultats) et **sémantique** (valeurs, contraintes, préférences stables). Récupération = similarité sémantique *pondérée par la récence* + rappel systématique des valeurs. **Résumés hiérarchiques** (chaque session → résumé compressé ; méta-résumés périodiques). **Boot injection** : décisions/valeurs pertinentes dans le premier prompt système du tour. **Oubli/consolidation** explicites (sinon l'app réactive de vieilles valeurs avec fausse confiance).

**Patterns de prompt (session qui produit TOUJOURS une sortie) :** machine à états GROW pilotée **côté code**, pas en free-form. Chaque phase a une condition de sortie (Goal → Reality [réinjection du passé] → Options [WRAP *Widen* : ≥3 options] → Will). Une question à la fois, socratique, auto-critiquée par le modèle avant d'être posée. **Sortie JSON schema obligatoire** en fin de session : `{décision, alternative_écartée, raison, plan_si_alors:[{si, alors}], hypothèse_à_vérifier, date_de_revue, confiance}` — pas de session sans cet objet. Pre-mortem systématique. Détection de contradiction avec l'historique, *signalée comme question, jamais comme jugement*.

**Pièges IA :** petits modèles qui dérivent (garder l'état hors-LLM), hallucinent des « faits » perso (interdire toute affirmation non présente dans la mémoire récupérée) et sont sycophantes (prompt anti-complaisance). **Privacy des embeddings : un embedding n'est PAS anonyme** (attaques d'inversion reconstruisent le texte) → embeddings 100 % locaux, vector store chiffré, jamais d'envoi à un tiers.

---

## 7. Privacy & sécurité — le positionnement, pas une feature

Pour un outil aussi intime, **la privacy EST le produit**. Playbook Ente/Bitwarden/Proton : E2E par défaut, zero-knowledge sur toute sync, code auditable, et — dès qu'il y a un peu de budget — **audit de sécurité tiers publié**. Local-first = argument frontal : « tes données ne quittent jamais ta machine ». Publier un modèle de menace clair et un rapport de transparence.

---

## 8. Open source, licence & business

**Licence recommandée : cœur en AGPL-3.0 + CLA.** Reste 100 % OSS crédible (essentiel pour un outil de confiance), force tout hébergeur SaaS à publier ses modifs, et le CLA te réserve le droit de vendre du hosted/pro. Si un jour tu ajoutes un service de sync chiffré, mets *ce module serveur* en **BSL/Elastic-2.0** (open-core). Éviter MIT/Apache seuls (zéro protection) et la SSPL (toxique en réputation). Le local-first est ton meilleur bouclier : sans données à héberger, le « cloud qui te copie » a peu de leviers.

**Monétisation (playbook Obsidian/Ente) :** logiciel local **gratuit à vie** → payant = **Sync E2E multi-appareils + backup chiffré** (abonnement modeste, 3-6 €/mois) + **licence Pro/commercial** (entreprise/coaching). Plus tard, éventuellement une marketplace de « templates de clarté ». **Ne jamais monétiser l'accès à ses propres données ni des insights psychologiques** (suicide éthique et réputationnel). Obsidian : bootstrappé, ~7 personnes, ~350 M$ de valo, revenus via Sync/Publish/licence — le modèle exact à viser.

---

## 9. Go-to-market (solo dev) — les 3 premiers mouvements

1. **Founder story + dogfooding public.** Arme n°1 : « je l'ai construit pour moi et mon frère ». Publier son usage réel, ses décisions prises grâce à l'outil. L'authenticité bat le marketing pour un outil intime.
2. **Lancement séquencé, pas simultané.** GitHub public soigné (README, démo, roadmap, screenshots) → **r/selfhosted + r/privacy** (audience local-first native) → **Show HN** (angle « local-first life-decision tool, no cloud, no tracking ») → **Product Hunt** en dernier, une fois les retours intégrés.
3. **Contenu de fond mensuel** sur la *méthode* (le cadre psychologique, pas la promo). Installe autorité + SEO. Pattern « OSS → contenu → confiance → conversion sync ».

---

## 10. Éthique & garde-fous (non négociables, dès la spec v1)

- **Jamais se prétendre thérapeute/médical.** Positionnement explicite « outil de clarté, pas un soin ». Disclaimer visible.
- **Détection de détresse + orientation.** Idéation suicidaire / crise → **sortir du flux GROW**, cesser de « coacher la décision », afficher ressources d'urgence locales (numéros par pays), sans diagnostiquer ni exfiltrer ces données.
- **Anti-dépendance by design.** Pas de dark patterns, pas de streaks culpabilisants, pas d'engagement maximisé. L'objectif est l'autonomie, pas le temps d'écran.
- **RGPD art. 9 (données sensibles).** Bien-être mental = catégorie spéciale. Local-first aide : minimisation, pas de collecte serveur, consentement explicite pour toute sync, chiffrement, export/effacement natifs.
- **Anti-surconfiance / anti-hallucination.** Le modèle exprime l'incertitude, présente le contre-argument de l'option choisie, ne dit jamais « tu devrais », et ne référence aucun « fait » perso non présent dans la mémoire. Décisions à fort enjeu (santé, argent, juridique) → rediriger vers un professionnel humain.

---

## 11. Roadmap séquencée — étape par étape

**Phase 0 — Cadrage & spec (maintenant).** Trancher les 6 décisions (§13). Rédiger la spec OpenSpec sur le périmètre validé. Écrire le flux de crise et les disclaimers *dans* la spec.

**Phase 1 — MVP (valider la thèse sur 2 users : toi + ton frère).**
Périmètre = axes [2] boussole de valeurs + [3] session de décision + [5] revue + mémoire.
- Tauri v2 + SQLite (SQLCipher) + sqlite-vec + FTS5 + Ollama, **sans sync** (fichier chiffré via Tailscale/Syncthing).
- Onboarding « une décision réelle en < 5 min ».
- Rituel de décision guidé (machine à états GROW, sortie JSON obligatoire, pre-mortem).
- Rituel hebdo (récolte + pattern + 1 décision + engagement).
- Boussole de valeurs (tri de cartes ACT + profil Schwartz léger).
- Mémoire : stockage + rappel des décisions passées + relecture d'issue.
- Table `events` append-only + soft-deletes + UUIDs dès le jour 1 (pour ne pas se fermer la porte du sync).
*Critère de succès MVP :* toi et ton frère l'utilisez spontanément 4 semaines de suite et pouvez citer une décision qu'il vous a aidés à trancher.

**Phase 2 — V1 (ouvrir).**
- Boucle quotidienne légère (capture voix, micro-tags).
- Rétrospectives trimestrielles ; rappels doux d'issue.
- Sync multi-device via libSQL replicas + E2E (recovery kit).
- Fallback cloud opt-in anonymisé.
- Sortie open source (AGPL + CLA), GitHub soigné, Show HN.

**Phase 3 — V2 (durabilité).**
- Sync/backup hosted payant (le revenu).
- Profil Big Five/VIA optionnel extrait au fil de l'usage.
- Modules avancés branchés sur la boucle : objectifs (Locke&Latham), habitudes (si — et seulement si — ils servent une décision).
- CRDT (Loro) *seulement si* l'édition concurrente devient réelle.

**Différé explicitement (hors scope jusqu'à preuve du contraire) :** calendrier, finances, santé, intégrations tierces, multi-utilisateur collaboratif, mobile natif complet. On ne les construit que s'ils branchent sur la boucle de décision.

---

## 12. Risques & mitigations

| Risque | Mitigation |
|---|---|
| **Churn** (le risque n°1 de la catégorie) | Valeur composée visible dès la semaine 1 ; mémoire gratifiante ; pas de streaks |
| **Scope creep** vers l'union de 10 apps | Un seul cœur (la Décision + sa boucle) ; liste de différés explicite |
| **Sur-architecture technique** | Pas de sync engine ni CRDT au MVP ; SQLite nu + fichier chiffré |
| **Pseudo-profondeur de l'IA** | Chaque session produit une sortie JSON concrète ; machine à états, pas free-form |
| **Privacy** (données ultra-intimes) | Local-first + E2E + embeddings locaux + audit publié |
| **Juridique / bien-être** | « Pas un thérapeute » + flux de crise + licence sans garantie + conseil juridique avant toute claim santé |
| **Soutenabilité solo** | Monétiser tôt (sync) ; CLA ; dogfooding qui garde la motivation |
| **« Pas vrai OSS »** (débat licence) | Cœur en AGPL (OSI-approved) ; source-available réservé au seul module serveur |

---

## 13. Statut des 6 décisions de cadrage (désormais informées)

1. **Coordination vs app unifiée** → **App unifiée** qui possède le modèle de données (la valeur = la continuité, impossible en collant 8 outils). *Tranché par la recherche.*
2. **Boucle atomique** → **rituel hebdo profond + capture quotidienne légère.** *Tranché.*
3. **IA locale vs cloud** → **local-first par défaut** (Qwen/Gemma via MLX/Ollama), **fallback cloud opt-in anonymisé.** *Tranché.*
4. **Wedge en une phrase** → voir §0. *Tranché.*
5. **Solo vs multi-utilisateur** → **mono-utilisateur multi-device** (toi + ton frère = 2 instances, pas du multi-tenant). *Tranché.*
6. **Cut MVP** → §11 Phase 1 ; différés listés. *Tranché.*

Les 6 décisions ont désormais une réponse par défaut motivée. Il te reste à les **valider ou contester**, pas à les découvrir.

---

## 14. Prochaines actions concrètes

1. **Valider/contester** les 6 réponses du §13 (c'est un choix de fondateur, pas une fatalité).
2. Choisir le format de spec : **OpenSpec** (proposition + exigences + design + tâches) sur le périmètre Phase 1.
3. Définir le **modèle d'objet « Décision »** en détail (champs, cycle de vie, questions IA par étape) — le pont entre la psycho et le code.
4. **Prototyper une seule session de décision guidée** sur un vrai choix que tu as en ce moment, pour tester la boucle sur du réel avant de tout specer.

> Recommandation : action 4 d'abord (prototype papier/IA d'une session), puis 1-3. Tester la boucle sur un vrai dilemme révèle en 20 minutes ce qu'une spec de 30 pages ne dira pas.
