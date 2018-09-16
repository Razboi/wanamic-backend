const
	User = require( "../models/User" );

findRandomUser = async( userId, exposition ) => {
	let user;
	try {
		const
			count = await User.countDocuments().exec(),
			randomNum = Math.floor( Math.random() * count );
		if ( exposition ) {
			[ user ] = await User.aggregate()
				.match({
					profileImage: { $ne: undefined },
					hobbies: { $ne: [] }
				})
				.project( "username fullname description hobbies profileImage" )
				.sample( 1 )
				.exec();
		} else {
			user = await User.findOne()
				.skip( randomNum )
				.select( "username fullname description hobbies profileImage" +
									" headerImage interests friends followers gender" +
									" birthday totalLikes totalViews country region" )
				.exec();
		}
		return user;
	} catch ( err ) {
		throw err;
	}
};

module.exports = findRandomUser;
