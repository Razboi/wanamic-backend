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
mongoose.connect( process.env.DEV_MONGODB_URL, { useNewUrlParser: true }).then(() => {
	console.log( "MongoDB connected" );
}).catch( err => console.log( err ));


describe( "User model", function() {
	var user;

	before( async function() {
		user = await new User({
			email: "test3@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
	});

	after( async function() {
		await User.remove({ email: "test3@gmail.com" });
	});

	it( "should return true", async function() {
		const validation = await user.isValidPassword( "test" );
		validation.should.equal( true );
	});

	it( "should return false for invalid password", async function() {
		const validation = await user.isValidPassword( "123" );
		validation.should.equal( false );
	});
});
