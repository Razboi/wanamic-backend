const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	Post = require( "../../src/models/Post" ),
	User = require( "../../src/models/User" );

dotenv.config();
chai.use( chaiHttp );
mongoose.connect( process.env.MONGODB_URL );



describe( "User model", function() {

	it( "should return true", function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				const validation = user.isValidPassword( "test" );
				validation.should.equal( true );
				done();
			}).catch( err => done( err ));
	});

	it( "should return false for invalid password", function( done ) {
		User.findOne({ email: "test@gmail.com" })
			.exec()
			.then( user => {
				const validation = user.isValidPassword( "123" );
				validation.should.equal( false );
				done();
			}).catch( err => done( err ));
	});
});
