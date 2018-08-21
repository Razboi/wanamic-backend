const
	User = require( "../models/User" );

findRandomUser = async userId => {
	try {
		const
			count = await User.countDocuments().exec(),
			randomNum = Math.floor( Math.random() * count ),
			user = await User.findOne()
				.skip( randomNum )
				.select(
					"username fullname description posts keywords profileImage " +
					"headerImage friends followers totalLikes"
				)
				.exec();
		return user;
	} catch ( err ) {
		throw err;
	}
};

module.exports = findRandomUser;
