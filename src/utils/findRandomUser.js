const
	User = require( "../models/User" );

findRandomUser = userId => {
	return new Promise( function( resolve, reject ) {
		loop = () => {
			User.count()
				.exec().then( count => {
					const randomNum = Math.floor( Math.random() * count );
					User.findOne()
						.skip( randomNum )
						.select(
							"username fullname description posts keywords profileImage " +
							"headerImage friends followers"
						)
						.exec()
						.then( user => {
							// if the returned user is not the requester resolve
							// else get another one
							if ( user.id !== userId ) {
								resolve( user );
							} else {
								loop();
							}
						})
						.catch( err => reject( err ));
				}).catch( err => reject( err ));
		};
		loop();
	});
};

module.exports = findRandomUser;
