const jwt = require( "jsonwebtoken" );

tokenVerifier = ( token, cb ) => {
	var err;

	if ( !token ) {
		err = new Error( "Empty token" );
		err.statusCode = 401;
		throw err;
	}
	try {
		// get userId from token
		userId = jwt.verify( token, process.env.SECRET_JWT );
		if ( cb ) {
			return cb( userId );
		}
		return userId;
	} catch ( err ) {
		err.statusCode = 401;
		throw err;
	}
};

module.exports = tokenVerifier;
