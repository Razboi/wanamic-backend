const
	chai = require( "chai" ),
	mongoose = require( "mongoose" ),
	User = require( "../../src/models/User" ),
	expect = chai.expect;

describe( "User model", function() {

	before( function( done ) {
		mongoose.connect( process.env.MONGODB_URL ).then(() => done());
	});

	it( "should return true", function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.then( user => {
				const validation = user.isValidPassword( "test" );
				expect( validation ).to.be.true;
				done();
			}).catch( err => done( err ));
	});

	it( "should return false for invalid password", function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.then( user => {
				const validation = user.isValidPassword( "123" );
				expect( validation ).to.be.false;
				done();
			}).catch( err => done( err ));
	});
});
