const
	User = require( "../models/User" );

findRandomUser = async userId => {
	try {
		const
			count = await User.countDocuments().exec(),
			randomNum = Math.floor( Math.random() * count ),
			user = await User.findOne()
				.skip( randomNum )
				.select( "username fullname description hobbies profileImage" +
									" headerImage interests friends followers gender" +
									" birthday totalLikes totalViews country region" )
				.exec();
		return user;
	} catch ( err ) {
		throw err;
	}
};

module.exports = findRandomUser;
