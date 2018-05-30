const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	bcrypt = require( "bcrypt" ),
	Post = require( "../../src/models/Post" ),
	User = require( "../../src/models/User" );

dotenv.config();
chai.use( chaiHttp );
mongoose.connect( process.env.MONGODB_URL );



describe( "User model", function() {
	before( function( done ) {
		new User({
			email: "test3@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		})
			.save()
			.then( user => done())
			.catch( err => done( err ));
	});

	it( "should return true", function( done ) {
		User.findOne({ email: "test3@gmail.com" })
			.exec()
			.then( user => {
				const validation = user.isValidPassword( "test" );
				validation.should.equal( true );
				done();
			}).catch( err => done( err ));
	});

	it( "should return false for invalid password", function( done ) {
		User.findOne({ email: "test3@gmail.com" })
			.exec()
			.then( user => {
				const validation = user.isValidPassword( "123" );
				validation.should.equal( false );
				done();
			}).catch( err => done( err ));
	});

	after( function( done ) {
		User.remove({ email: "test3@gmail.com" })
			.then(() => done())
			.catch( err => done( err ));
	});
});
