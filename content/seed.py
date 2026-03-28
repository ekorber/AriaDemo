from datetime import datetime, timezone


def seed_campaigns(db):
    """Insert the Velo Fitness seed campaign if the campaigns collection is empty."""
    if db.campaigns.count_documents({}) > 0:
        return

    db.campaigns.insert_one({
        "lead_id": "",
        "client_name": "Velo Fitness",
        "project_type": "Product Launch — Connected Home Bike",
        "brief": (
            "Velo is launching their first connected home bike with live classes "
            "and an AI coach feature. Target audience is 30-45 year old professionals "
            "who want boutique fitness at home. The bike ships next month — this "
            "campaign builds pre-launch buzz and drives waitlist signups."
        ),
        "tone": "hype",
        "status": "ready",
        "created_at": datetime(2025, 3, 25, tzinfo=timezone.utc),
        "social_posts": [
            {
                "id": "seed_post_1",
                "platform": "instagram",
                "hook": "Your gym membership just became optional.",
                "caption": (
                    "We spent two years building the bike we wanted but couldn't find "
                    "— one that actually adapts to you, not the other way around.\n\n"
                    "Velo's connected home bike launches next month with live classes, "
                    "on-demand rides, and an AI coach that learns your patterns and "
                    "pushes you exactly when you need it.\n\n"
                    "This isn't another piece of equipment that becomes a clothes rack. "
                    "This is the thing that replaces your 6am commute to the studio.\n\n"
                    "[product hero shot: bike in a modern living room, morning light, "
                    "screen showing a live class with instructor]\n\n"
                    "Join the waitlist — link in bio. First 500 riders get founding "
                    "member pricing.\n\n"
                    "#VeloFitness #ConnectedFitness #HomeBike #FitnessTech #AICoach "
                    "#HomeWorkout #IndoorCycling #FitnessLaunch #BoutiqueFitness "
                    "#SmartBike #WaitlistOpen #LaunchDay"
                ),
                "edited": False,
                "approved": True,
                "scheduled_date": None,
            },
            {
                "id": "seed_post_2",
                "platform": "tiktok",
                "hook": "POV: you just finished a live cycling class and you never left your apartment",
                "caption": (
                    "The screen fades out. Your legs are shaking. The AI coach just "
                    "told you that was your best sprint in three weeks.\n\n"
                    "And your commute home? Walking to the shower.\n\n"
                    "Velo built a connected bike that doesn't just stream classes — it "
                    "actually coaches you. Real-time power zones. Adaptive difficulty. "
                    "It knows when you're sandbagging.\n\n"
                    "Waitlist is open. This ships next month.\n\n"
                    "#FitnessTok #HomeBike #VeloFitness #ConnectedFitness #AIFitness "
                    "#WorkoutFromHome"
                ),
                "edited": False,
                "approved": True,
                "scheduled_date": None,
            },
            {
                "id": "seed_post_3",
                "platform": "x",
                "hook": (
                    "Hot take: the reason most home bikes collect dust isn't motivation "
                    "— it's that the software is boring. Velo fixed the software."
                ),
                "caption": "",
                "edited": False,
                "approved": True,
                "scheduled_date": None,
            },
            {
                "id": "seed_post_4",
                "platform": "facebook",
                "hook": (
                    "Be honest — how many times have you skipped the gym this month "
                    "because getting there was the hardest part?"
                ),
                "caption": (
                    "That's the problem Velo set out to solve. Not motivation. Not "
                    "willpower. Just the friction.\n\n"
                    "Their new connected home bike brings boutique studio classes into "
                    "your living room — live rides, on-demand library, and an AI coach "
                    "that adjusts the workout to your fitness level in real time.\n\n"
                    "No commute. No class schedule to work around. No fighting for a "
                    "bike in the back row.\n\n"
                    "It ships next month, and the first 500 people on the waitlist get "
                    "founding member pricing.\n\n"
                    "Would you switch from your gym to a setup like this? Or do you "
                    "need the in-person energy to stay consistent? Genuinely curious "
                    "— drop your take below."
                ),
                "edited": False,
                "approved": True,
                "scheduled_date": None,
            },
            {
                "id": "seed_post_5",
                "platform": "youtube_shorts",
                "hook": "AI coach vs. spinning instructor — who wins?",
                "caption": (
                    "Watch what happens when we put Velo's AI cycling coach head-to-head "
                    "against a traditional studio class. The Velo connected home bike "
                    "uses real-time power zone tracking and adaptive resistance to "
                    "personalize every ride. Whether you're training for a century ride "
                    "or just getting back into fitness, Velo's AI coach meets you where "
                    "you are. Launching next month with live classes and on-demand rides.\n\n"
                    "#VeloFitness #ConnectedBike #AICoach #HomeCycling #FitnessTech"
                ),
                "edited": False,
                "approved": True,
                "scheduled_date": None,
            },
            {
                "id": "seed_post_6",
                "platform": "threads",
                "hook": "genuinely did not expect to be this sore from a bike that lives in my spare bedroom",
                "caption": (
                    "velo sent us an early unit and the AI coach does not care about "
                    "your feelings. it just quietly makes the ride harder when it knows "
                    "you can handle it \U0001f6b4"
                ),
                "edited": False,
                "approved": True,
                "scheduled_date": None,
            },
        ],
    })
