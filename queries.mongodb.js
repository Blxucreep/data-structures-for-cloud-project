/* set up the database connection */
use('epic_games_store');

/* user view queries */
// view reviews for a specific game
use('epic_games_store');
db.games.aggregate([
  {
    $match: { game_slug: "celeste" }
  },
  {
    $lookup: {
      from: "open_critic",
      localField: "id",
      foreignField: "game_id",
      as: "reviews"
    }
  },
  {
    $project: {
      name: 1,
      "reviews.author": 1,
      "reviews.rating": 1,
      "reviews.comment": 1,
      "reviews.date": 1
    }
  }
])

// find hardware requirements for a game
use('epic_games_store');
db.games.aggregate([
  {
    $match: { game_slug: "celeste" }
  },
  {
    $lookup: {
      from: "necessary_hardware",
      localField: "id",
      foreignField: "fk_game_id",
      as: "necessaryHardware"
    }
  },
  {
    $project: {
      name: 1,
      "necessaryHardware.operating_system": 1,
      "necessaryHardware.processor": 1,
      "necessaryHardware.memory": 1,
      "necessaryHardware.graphics": 1,
      "necessaryHardware.graphics_memory": 1
    }
  }
])

// search for social networks for a game
use('epic_games_store');
db.games.aggregate([
  {
    $match: { game_slug: "rainbow-six-siege" }
  },
  {
    $lookup: {
      from: "social_networks",
      localField: "id",
      foreignField: "fk_game_id",
      as: "socialNetworks"
    }
  },
  {
    $project: {
      name: 1,
      "socialNetworks.url": 1,
      "socialNetworks.description": 1
    }
  }
])

// view tweets related to a game
use('epic_games_store');
db.games.aggregate([
  {
    $match: { game_slug: "shadow-complex" }
  },
  {
    $lookup: {
      from: "twitter_accounts",
      localField: "id",
      foreignField: "fk_game_id",
      as: "twitterAccounts"
    }
  },
  {
    $unwind: "$twitterAccounts"
  },
  {
    $lookup: {
      from: "tweets",
      localField: "twitterAccounts.id",
      foreignField: "twitter_account_id",
      as: "tweets"
    }
  },
  {
    $unwind: "$tweets"
  },
  {
    $project: {
      name: 1,
      "twitterAccounts.username": 1,
      "tweets.text": 1,
      "tweets.quantity_likes": 1,
      "tweets.timestamp": 1
    }
  }
]);


/* data analyst view queries */
// average rating for each game over time
use('epic_games_store');
db.games.aggregate([
  {
    $lookup: {
      from: "open_critic",
      localField: "id",
      foreignField: "game_id",
      as: "reviews"
    }
  },
  {
    $unwind: "$reviews"
  },
  {
    $addFields: {
      "reviews.date": { $toDate: "$reviews.date" }
    }
  },
  {
    $group: {
      _id: { name: "$name", month: { $month: "$reviews.date" } },
      avgRating: { $avg: "$reviews.rating" },
      reviewCount: { $sum: 1 }
    }
  },
  {
    $project: {
      name: "$_id.name",
      month: "$_id.month",
      avgRating: 1,
      reviewCount: 1
    }
  }
])

// identify most active games on twitter
use('epic_games_store');
db.games.aggregate([
  {
    $lookup: {
      from: "twitter_accounts",
      localField: "id",
      foreignField: "fk_game_id",
      as: "twitterAccounts"
    }
  },
  {
    $unwind: "$twitterAccounts"
  },
  {
    $lookup: {
      from: "tweets",
      localField: "twitterAccounts.id",
      foreignField: "twitter_account_id",
      as: "tweets"
    }
  },
  {
    $unwind: "$tweets"
  },
  {
    $group: {
      _id: "$name",
      tweetCount: { $sum: 1 }
    }
  },
  {
    $sort: { tweetCount: -1 }
  }
]);

// top 5 publishers by average game rating
use('epic_games_store');
db.games.aggregate([
  {
    $lookup: {
      from: "open_critic",
      localField: "id",
      foreignField: "game_id",
      as: "reviews"
    }
  },
  {
    $unwind: "$reviews"
  },
  {
    $group: {
      _id: "$publisher",
      avgRating: { $avg: "$reviews.rating" },
      reviewCount: { $count: {} }
    }
  },
  {
    $match: { reviewCount: { $gte: 10 } }
  },
  {
    $sort: { avgRating: -1 }
  },
  {
    $limit: 5
  }
])

// trending genres based on twitter activity and reviews
use('epic_games_store');
db.twitter_accounts.aggregate([
  // we join the tweets with the twitter accounts
  {
    $lookup: {
      from: "tweets",
      localField: "id",
      foreignField: "twitter_account_id",
      as: "tweets"
    }
  },
  // we add a field to count the number of tweets for each account
  {
    $addFields: {
      tweetCount: { $size: "$tweets" }
    }
  },
  // we join the twitter accounts with the games
  {
    $lookup: {
      from: "games",
      localField: "fk_game_id",
      foreignField: "id",
      as: "games"
    }
  },
  {
    $unwind: "$games"
  },
  {
    $unwind: "$games.genres"
  },
  // we regroup the games by genre
  {
    $group: {
      _id: "$games.genres",
      totalTweetCount: { $sum: "$tweetCount" }
    }
  },
  // we sort the genres by the total number of tweets
  { $sort: { totalTweetCount: -1 } }
])
