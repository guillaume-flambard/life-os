# Life OS — PRD (Product Requirements Document)

> Format compatible BMAD (Goals & Context → Requirements FR/NFR → UX Goals → Technical Assumptions → Epics & Stories). Destiné à être donné à Claude Code / l'agent PM ou Architect BMAD, puis shardé en stories.
>
> Sources de fond : `docs/life-os-blueprint-v2.md`, `docs/life-os-axes-psycho.md`.
> Statut : v1 — MVP. À valider par Guillaume avant sharding.

---

## 1. Goals and Background Context

### Goals
- Permettre à une personne de **clarifier ce qui compte pour elle** et d'y **rester fidèle** dans ses décisions.
- Faire de chaque **décision de vie** un objet traçable, réversible et relu (pas une note perdue).
- Offrir une **revue honnête et bienveillante** : « ai-je vécu ce que j'ai dit vouloir vivre ? ».
- Rester **léger et humain** : ne jamais transformer la vie en tableau de bord anxiogène.
- Être **local-first, privacy-first, open source** : les données ne quittent jamais la machine par défaut.
- Valider la thèse sur **2 utilisateurs réels** (le fondateur + son frère) avant toute généralisation.

### Background Context
Life OS est un **life coach dont le moteur applique la logique du spec-driven development (OpenSpec) et de l'agentique-agile (BMAD) à la vie**. Concrètement : la vie de l'utilisateur possède une **spec vivante** (ses valeurs et engagements, écrits comme des repères testables « quand X, je Y », organisés par pans de vie) ; chaque **décision** est traitée comme une *proposition de changement* qui modifie cette spec (ajout / modification / arrêt) ; les objectifs sont découpés en **petits pas auto-suffisants** ; et la **revue** vérifie l'écart entre la spec et le vécu.

La rigueur du moteur (traçabilité, testabilité, revue) reste **invisible**. Le produit expose **deux couches sur le même moteur** :
- **Mode humain (défaut)** : uniquement de la conversation chaleureuse et des pages simples. Aucun jargon (« spec », « delta », « QA », « scénario » n'apparaissent jamais). L'IA traduit ce que dit l'utilisateur en spec testable en coulisses, et lui restitue tout en mots normaux.
- **Mode expert (optionnel)** : révèle la mécanique Git-like (specs, change proposals, deltas) pour les utilisateurs techniques.

Le différenciateur (« Git pour ta vie ») est unique : aucun produit ne réunit spec de vie testable + décision-comme-proposition-de-changement + revue-de-conformité + rôles multi-agents, en local-first open source. Le risque n°1, documenté, est la **sur-systématisation** de la vie ; le produit doit être conçu contre ce risque (voir NFR dédiées).

### Change Log
| Date | Version | Description | Auteur |
|---|---|---|---|
| 2026-08-31 | v1 | PRD initial MVP | Cowork (pour Guillaume) |

---

## 2. Requirements

### Functional (FR)

- **FR1 — Boussole (Life-Spec).** Le système permet de définir des *pans de vie* et, dans chacun, des *intentions* exprimées en langage naturel, converties en coulisses en repères testables de forme « quand [situation], je [action] ».
- **FR2 — Priorité d'intention.** Chaque intention porte un niveau : ligne rouge (non-négociable) / j'aimerais / bonus. (Interne : MUST / SHOULD / MAY.)
- **FR3 — Décision guidée.** Le système mène une conversation guidée sur une décision réelle, une question à la fois, et produit une *proposition de changement* : le pourquoi, ce que ça change dans la vie de l'utilisateur (ajout / modification / arrêt d'intentions), et au moins un prochain petit pas.
- **FR4 — Débiaisage.** La conversation de décision inclut : élargir les options (au moins 3, dont une alternative « et si aucune ? »), un pré-mortem (« dans un an, ça a échoué — pourquoi ? ») et une mise à distance (10 min / 10 mois / 10 ans).
- **FR5 — Alignement aux valeurs.** Le système confronte l'option pressentie à la boussole et le signale à l'utilisateur en mots simples (« ça colle avec ce que tu m'as dit tenir à… / ça tire contre… »).
- **FR6 — Prochain petit pas (story).** Toute décision finalisée génère au moins une action auto-suffisante (avec son contexte : pourquoi, quand, à quoi on saura que c'est fait).
- **FR7 — Le point (revue/QA).** Le système propose une revue périodique qui rejoue les intentions et demande, sans juger, si le vécu a suivi ; il enregistre l'issue et un apprentissage.
- **FR8 — Intégration.** À la revue, une décision confirmée met à jour la boussole (le changement devient le nouveau normal) ; l'historique est conservé.
- **FR9 — Mémoire.** Le système stocke les décisions et intentions localement et rappelle les éléments pertinents pendant une nouvelle conversation (recherche mot-clé + sémantique, pondérée par la récence).
- **FR10 — Détection de contradiction.** Le système peut signaler une tension entre la décision courante et l'historique, **toujours sous forme de question**, jamais de jugement.
- **FR11 — Onboarding par la valeur.** Un nouvel utilisateur traite une décision réelle dès la première session (< 5 min), sans questionnaire et sans compte requis pour recevoir de la valeur.
- **FR12 — Profil par extraction.** Le profil (valeurs récurrentes, patterns) se construit à partir de l'usage, jamais par un formulaire de personnalité initial.
- **FR13 — Deux modes.** Le système propose un mode humain (défaut, sans jargon) et un mode expert (révélant la mécanique spec/delta). Le même moteur alimente les deux.
- **FR14 — Une seule voix.** En mode humain, l'utilisateur interagit avec un unique compagnon ; les « rôles » (explorer / décider / faire le point) sont des *moments* de conversation, jamais des personnages distincts.
- **FR15 — Export / effacement.** L'utilisateur peut exporter toutes ses données (format ouvert, dont Markdown) et les effacer intégralement.

### Non-Functional (NFR)

- **NFR1 — Local-first.** Les données résident et sont traitées sur l'appareil ; l'app fonctionne hors-ligne.
- **NFR2 — Privacy.** Chiffrement au repos ; embeddings générés localement et jamais transmis ; aucune télémétrie.
- **NFR3 — IA locale par défaut.** Le dialogue tourne sur un modèle local ; tout recours au cloud est opt-in explicite, anonymisé avant envoi, avec journal consultable.
- **NFR4 — Toujours une sortie.** Aucune session de décision ne se termine sans produire une proposition structurée valide (validée par schéma en coulisses).
- **NFR5 — Latence.** Une réponse conversationnelle sur le modèle local reste fluide sur un Mac Apple Silicon récent.
- **NFR6 — Longévité des données.** SQLite comme source de vérité + export Markdown ; migrations forward-only, idempotentes.
- **NFR7 — Portabilité.** Cible desktop d'abord (macOS), architecture n'excluant pas mobile ultérieur.

### Non-Functional — Anti-sur-systématisation (garde-fous produit de premier ordre)

- **NFR8 — Plafonds.** Le système limite par défaut le nombre de pans de vie actifs (3-5) et d'intentions par pan (~3). Ajouter de la structure demande un effort croissant, jamais décroissant.
- **NFR9 — Valeurs, pas métriques.** La boussole décrit des comportements sous condition, pas des KPIs. Toute quantification est opt-in, rare, et interdite par défaut sur ce qui doit rester aimé (relations, repos, loisir).
- **NFR10 — Anti-Goodhart.** Jamais un chiffre-cible isolé ; toute mesure opt-in est appariée à un repère qualitatif et peut expirer ; la revue interroge « cette mesure me pousse-t-elle à tricher ? ».
- **NFR11 — Slack first-class.** Zones « sans repère » et jours off explicitement supportés ; le coach peut recommander de *ne pas* planifier.
- **NFR12 — Le système se retire.** Le succès se traduit par *moins* d'accompagnement (autonomie), pas plus ; l'échafaudage se retire quand l'intention est tenue durablement.
- **NFR13 — Ton non-bureaucratique.** Interactions courtes, langage humain ; jamais de langage de dette, d'échec, de conformité, de « streak » culpabilisant.

### Non-Functional — Sécurité & éthique

- **NFR14 — Pas un thérapeute.** Positionnement « outil de clarté, pas un soin » visible ; pas de diagnostic.
- **NFR15 — Flux de détresse.** Sur signes de crise (désespoir, idéation suicidaire), le système quitte le flux de coaching et affiche des ressources d'urgence locales, sans exfiltrer ces données.
- **NFR16 — Enjeux forts.** Décisions santé / argent / juridique majeures : le système aide à structurer mais renvoie vers un professionnel humain, ne tranche pas.
- **NFR17 — Anti-sycophancie.** Le système exprime l'incertitude, présente le contre-argument de l'option choisie, ne dit jamais « tu devrais », n'affirme aucun fait personnel non présent dans la mémoire.

---

## 3. User Interface / Interaction Goals

### Vision d'ensemble
Une expérience **conversationnelle, chaleureuse, minimale**. La structure spec-driven est un échafaudage invisible. L'utilisateur non-technique ne rencontre que : une conversation, une page « boussole » (ses valeurs dans ses mots), un « carnet de décisions », et « le point » périodique.

### La couche de traduction (façade → moteur)
| Moteur (jamais montré en mode humain) | Façade humaine |
|---|---|
| Life-Spec | « ta boussole » |
| Domaine | un pan de vie (« Tes proches », « Ton corps »…) |
| Requirement | « une intention » / « ce qui compte » |
| MUST / SHOULD / MAY | ligne rouge / j'aimerais / bonus |
| Scénario GIVEN/WHEN/THEN | « quand [situation], je [action] » |
| Change proposal | « une décision à prendre » |
| delta ADDED/MODIFIED/REMOVED | « ce que ça change : tu ajoutes / changes / arrêtes » |
| story | « ton prochain petit pas » |
| apply / archive | « c'est acté » |
| QA / review | « le point de la semaine » |
| rôles d'agents | une seule voix ; des *moments*, pas des personnages |

### Principes de ton
- Relation, pas audit (« ce qui compte pour toi », pas « conformité »).
- Une question à la fois ; questions qui *challengent* avec bienveillance, jamais qui valident à vide.
- La revue ouvre une conversation, elle ne coche pas des cases.

### Surfaces clés (MVP)
1. **Accueil / conversation** (point d'entrée unique).
2. **Boussole** (pans de vie + intentions, éditables).
3. **Carnet de décisions** (décisions passées + ce qui a changé + issue).
4. **Le point** (revue périodique).
5. **Réglages** (mode humain/expert, export, effacement).

---

## 4. Technical Assumptions

- **Moteur de données = OpenSpec transposé** : Life-Spec (specs par domaine), décisions (change proposals à delta ADDED/MODIFIED/REMOVED), intentions (Requirement + scénario GWT en interne), cycle proposer→revoir→appliquer→archiver.
- **Rôles = BMAD transposé, mais en lentilles séquentielles** (un seul modèle qui adopte des cadres distincts), pas en débat multi-agents (sans gain fiable prouvé, et « multi-persona » souvent contre-productif).
- **Stack** : Tauri v2 (desktop→mobile), UI TypeScript ; SQLite (SQLCipher) source de vérité + FTS5 + sqlite-vec ; export Markdown ; IA locale via Ollama/MLX (principal : Qwen3.5 ~9B ou Gemma 3/4 12B ; utilitaire JSON : Gemma E2B) ; embeddings locaux.
- **Sync** : aucun au MVP (fichier chiffré via Tailscale/Syncthing) ; `events` append-only + soft-deletes + UUID dès j1 pour ne pas se fermer la porte.
- **Licence** : cœur AGPL-3.0 + CLA ; module serveur de sync éventuel en source-available.
- **Testing** : les repères GWT de l'utilisateur sont eux-mêmes des tests de conformité rejoués à la revue (le produit mange sa propre nourriture).

---

## 5. Epic List (MVP)

1. **Epic 1 — Fondations & moteur** : app Tauri, SQLite chiffré, IA locale, modèle de données (spec + décision + delta), migrations.
2. **Epic 2 — Boussole (Life-Spec)** : définir pans de vie + intentions en langage naturel, converties en repères testables ; priorités ligne rouge/j'aimerais/bonus.
3. **Epic 3 — Décision guidée (change proposal)** : conversation GROW en mode humain, débiaisage, alignement valeurs, sortie structurée + delta.
4. **Epic 4 — Prochain petit pas (story)** : génération d'actions auto-suffisantes reliées à la décision.
5. **Epic 5 — Le point (revue/QA)** : revue périodique bienveillante, saisie d'issue + apprentissage, intégration du delta dans la boussole.
6. **Epic 6 — Mémoire** : recherche hybride, rappel contextuel, détection de contradiction.
7. **Epic 7 — Onboarding par la valeur** : une décision réelle en < 5 min, sans compte.
8. **Epic 8 — Garde-fous & sécurité** : plafonds anti-sur-systématisation, flux de détresse, disclaimers, export/effacement, deux modes.

---

## 6. Epic Details (stories & critères d'acceptation)

> Grain volontairement laissé « shardable » : à découper en stories fines par le Scrum Master BMAD. Critères en langage humain + repère testable.

### Epic 2 — Boussole
- **Story 2.1 — Créer un pan de vie.** *En tant qu'utilisateur, je nomme un pan de ma vie.* AC : je peux créer/renommer/archiver un pan ; plafond de pans actifs respecté (NFR8).
- **Story 2.2 — Exprimer une intention en langage naturel.** AC : je saisis « je veux être plus présent pour mon frère » ; le système la reformule en repère « quand [situation], je [action] » que je valide ou corrige ; le jargon n'apparaît jamais.
- **Story 2.3 — Prioriser.** AC : je marque chaque intention ligne rouge / j'aimerais / bonus.

### Epic 3 — Décision guidée
- **Story 3.1 — Ouvrir une décision.** AC : « quelle décision te trotte en tête ? » → conversation lancée.
- **Story 3.2 — Explorer et cadrer.** AC : une question à la fois ; rappel des intentions/décisions pertinentes injecté ; élargissement à ≥3 options.
- **Story 3.3 — Débiaiser.** AC : pré-mortem + mise à distance 10/10/10 réalisés.
- **Story 3.4 — Aligner & trancher.** AC : confrontation valeurs restituée en mots simples ; sortie = proposition avec pourquoi, ce que ça change (delta), confiance, date de revue ; jamais de fin sans sortie valide (NFR4).

### Epic 5 — Le point (revue)
- **Story 5.1 — Rejouer les repères.** AC : le système redonne les intentions et demande, sans juger, si le vécu a suivi (« quand [situation] est arrivée, tu as [action] ? »).
- **Story 5.2 — Issue & apprentissage.** AC : je note mieux/comme prévu/moins bien/trop tôt + un apprentissage.
- **Story 5.3 — Intégrer.** AC : une décision confirmée met à jour la boussole ; historique conservé.

### Epic 8 — Garde-fous & sécurité
- **Story 8.1 — Plafonds & slack.** AC : au-delà du plafond, le système invite à retirer avant d'ajouter ; zones sans repère supportées.
- **Story 8.2 — Détresse.** AC : signaux de crise → sortie du flux + ressources locales, sans exfiltration.
- **Story 8.3 — Deux modes.** AC : bascule humain/expert ; en humain, aucun terme technique visible.

*(Epics 1, 4, 6, 7 : stories à détailler au sharding — modèle de données, génération de stories, mémoire hybride, onboarding.)*

---

## 7. Success Metrics (MVP)

- **Usage réel** : le fondateur et son frère utilisent le cycle 4 semaines de suite.
- **Preuve de valeur** : chacun peut montrer une décision passée en proposition de changement + sa revue, et citer une clarté obtenue.
- **Non-régression anti-lourdeur** : aucun des deux n'a l'impression de « nourrir un système » ; le temps par interaction reste court.
- **Fidélité du langage** : en mode humain, zéro terme technique rencontré.

---

## 8. Out of Scope (MVP)

Boucle de capture quotidienne, sync multi-device, fallback cloud, profil Big Five/VIA formel, rétrospectives trimestrielles automatiques, calendrier, finances, santé, habitudes élaborées, multi-utilisateur collaboratif, toute métrique quantifiée non essentielle, gamification.

---

## 9. Décisions à confirmer (open questions)

1. **Nom de façade** pour le mode humain (« Life OS » reste nom de code / mode expert ?).
2. **Cadence de « le point »** : hebdo par défaut ? laissée libre ?
3. **Pans de vie de départ** proposés (relations / corps / travail / argent / croissance) ou 100 % libres ?
4. **Périmètre exact du MVP** : garde-t-on la détection de contradiction (FR10) en MVP ou V1 ?
5. **Voix & ton** : tutoiement, longueur des réponses, niveau de challenge.
