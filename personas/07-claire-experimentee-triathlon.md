# Persona 7 — Claire, la triathlète expérimentée

## Identité

| Champ | Détail |
|-------|--------|
| **Nom** | Claire Vasseur |
| **Âge** | 42 ans |
| **Profession** | Avocate en droit des affaires |
| **Situation** | Mariée, 2 enfants (10 et 13 ans) |
| **Localisation** | Nice |

## Profil sportif

| Champ | Détail |
|-------|--------|
| **Sport principal** | Triathlon longue distance |
| **Disciplines** | Natation, vélo, course à pied |
| **Sports complémentaires** | Renforcement musculaire (2x/semaine) et prévention blessures (étirements, mobilité) |
| **Niveau** | Avancé (8 ans de triathlon, plusieurs Ironman 70.3, prépare son premier Ironman complet) |
| **Fréquence** | 8 à 10 entraînements / semaine (doubles certains jours) |
| **Équipement** | Vélo de triathlon, montre Garmin, capteur de puissance, accès piscine et salle de sport |
| **Coach** | Suivie par un coach humain depuis 3 ans |

## Objectifs

- Terminer son premier Ironman complet (3.8 km / 180 km / 42.2 km) en moins de 13h
- Optimiser la répartition des volumes entre les 3 disciplines + le renforcement
- Gérer la charge d'entraînement sans se blesser (historique de tendinite au tendon d'Achille)
- Améliorer la communication avec son coach grâce à un outil centralisé

## Frustrations & pain points

- Utilise TrainingPeaks pour les plans du coach, Garmin Connect pour les données GPS, un tableur pour le renforcement — pas de vue d'ensemble
- Son coach n'a pas de visibilité facile sur ses données de bien-être (fatigue, sommeil, stress) pour ajuster les séances
- Les séances de renforcement musculaire et de prévention sont planifiées à part et souvent oubliées quand le volume tri est élevé
- Les apps de triathlon ne gèrent pas bien les briques (enchaînements vélo → course)
- Besoin de voir la charge d'entraînement globale (tri + renforcement) et pas seulement par discipline

## Comportement attendu dans l'app

- **Planification** : Son coach planifie les séances dans l'app (macro et micro cycles). Les séances de renforcement sont intégrées dans le même plan que les séances tri. Vue calendrier avec charge d'entraînement par semaine (toutes activités confondues). Gestion des briques (enchaînements)
- **Saisie** : Import automatique des données GPS (natation, vélo, course) depuis sa montre Garmin. Saisie manuelle pour le renforcement (exercices, séries, reps, charge). Notes qualitatives après chaque séance
- **Données bien-être** : Suit quotidiennement son sommeil, sa fatigue (échelle 1-10), son stress, ses douleurs (tendon d'Achille ++), son poids, et son cycle menstruel. Ces données sont visibles par son coach
- **Mentor** : Coach humain qui accède au dashboard complet, commente les séances, ajuste le plan en fonction des retours et des données de bien-être. Le coach reçoit des alertes si des signaux d'alerte apparaissent (fatigue chronique, douleur persistante, poids en chute)

## Scénario d'utilisation type

> Claire termine une brique vélo-course le samedi matin (2h30 vélo + 45 min course). Les données GPS se synchronisent automatiquement. Elle ajoute ses notes : "Bonnes sensations sur le vélo, puissance stable à 165W. Transition OK mais douleur légère au tendon d'Achille à partir du km 3 de la course (2/10)." L'après-midi, elle fait sa séance de renforcement (squats, fentes, travail excentrique mollets pour le tendon, gainage) et saisit ses séries. Le dimanche, son coach consulte le dashboard : il voit la charge de la semaine (12h d'entraînement dont 2 séances renfo), la douleur au tendon signalée, et la fatigue à 6/10. Il ajuste le plan de la semaine suivante : il réduit la course de mardi, ajoute une séance de mobilité, et laisse un commentaire : "Bonne semaine mais on surveille le tendon. Si la douleur revient en course, on réduit le volume running la semaine d'après."

## Métriques de succès

- Charge d'entraînement hebdomadaire respectée (objectif vs réalisé, toutes disciplines)
- Progression sur les allures/puissances cibles par discipline
- Score de santé du tendon d'Achille (fréquence et intensité des douleurs)
- Fréquence d'interaction coach ↔ athlète dans l'app
- Résultat le jour de la course (finir l'Ironman < 13h)
