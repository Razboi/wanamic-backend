const
	chai = require( "chai" ),
	chaiHttp = require( "chai-http" ),
	should = chai.should(),
	request = require( "request" ),
	mongoose = require( "mongoose" ),
	dotenv = require( "dotenv" ),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../../src/utils/tokenGenerator" ),
	User = require( "../../src/models/User" ),
	Comment = require( "../../src/models/Comment" ),
	Notification = require( "../../src/models/Notification" ),
	Post = require( "../../src/models/Post" );


dotenv.config();
chai.use( chaiHttp );

describe( "POST comments/create", function() {
	var
		author,
		post,
		token;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await Post.remove({ author: author._id });
		await Comment.remove({ author: author._id });
		await Notification.remove({
			author: author._id,
			comment: true
		});
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
		post = await new Post({
			author: author._id,
			content: "test"
		}).save();
	});

	it( "creates a comment", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/create" )
			.send({
				token: token,
				postId: post._id,
				comment: "test"
			})
			.end(( err, res ) => {
				res.should.have.status( 201 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/create" )
			.send({
				token: token,
				postId: post._id
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/create" )
			.send({
				token: token,
				comment: "test"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/create" )
			.send({
				postId: post._id,
				comment: "test"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/create" )
			.send({
				token: "123213adasdsad21321321",
				postId: post._id,
				comment: "test"
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


describe( "DELETE comments/delete", function() {
	var
		token,
		author,
		comment,
		post;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await Post.remove({ author: author._id });
		await Comment.remove({ author: author._id });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
		post = await new Post({
			author: author._id,
			content: "test"
		}).save();
		comment = await new Comment({
			author: author._id,
			content: "test",
			post: post._id
		}).save();
	});

	it( "deletes a comment, should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/comments/delete" )
			.send({
				token: token,
				postId: post._id,
				commentId: comment._id
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/comments/delete" )
			.send({
				token: token,
				postId: post._id
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/comments/delete" )
			.send({
				token: token,
				commentId: comment._id
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/comments/delete" )
			.send({
				postId: post._id,
				commentId: comment._id
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.delete( "/comments/delete" )
			.send({
				token: "123213adasdsad21321321",
				postId: post._id,
				commentId: comment._id
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});



describe( "PATCH comments/update", function() {
	var
		token,
		author,
		comment,
		post;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await Post.remove({ author: author._id });
		await Comment.remove({ author: author._id });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
		post = await new Post({
			author: author._id,
			content: "test"
		}).save();
		comment = await new Comment({
			author: author._id,
			content: "Update me",
			post: post._id
		}).save();
	});

	it( "updates a comment, should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.patch( "/comments/update" )
			.send({
				token: token,
				newContent: "updated",
				commentId: comment._id
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.patch( "/comments/update" )
			.send({
				token: token,
				newContent: "updated"
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.patch( "/comments/update" )
			.send({
				token: token,
				commentId: comment._id
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.patch( "/comments/update" )
			.send({
				newContent: "updated",
				commentId: comment._id
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.patch( "/comments/update" )
			.send({
				token: "123213adasdsad21321321",
				newContent: "updated",
				commentId: comment._id
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});


describe( "POST comments/retrieve/:skip", function() {
	var
		token,
		author,
		post;

	after( async function() {
		await User.remove({ email: "test@gmail.com" });
		await Post.remove({ author: author._id });
	});

	before( async function() {
		author = await new User({
			email: "test@gmail.com",
			username: "testuser",
			fullname: "Test User",
			passwordHash: bcrypt.hashSync( "test", 10 )
		}).save();
		token = await tokenGenerator( author );
		post = await new Post({
			author: author._id,
			content: "test"
		}).save();
	});

	it( "gets the post comments, should return 200", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/retrieve/0" )
			.send({
				token: token,
				postId: post._id
			})
			.end(( err, res ) => {
				res.should.have.status( 200 );
				done();
			});
	});

	it( "should return 404 for endpoint not found", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/retrieve/" )
			.send({
				token: token,
				postId: post._id
			})
			.end(( err, res ) => {
				res.should.have.status( 404 );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/retrieve/0" )
			.send({
				token: token
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 422 Empty data", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/retrieve/0" )
			.send({
				postId: post._id
			})
			.end(( err, res ) => {
				res.should.have.status( 422 );
				res.text.should.equal( "Required data not found" );
				done();
			});
	});

	it( "should return 401 malformed jwt", function( done ) {
		chai.request( "localhost:8000" )
			.post( "/comments/retrieve/0" )
			.send({
				token: "123213adasdsad21321321",
				postId: post._id
			})
			.end(( err, res ) => {
				res.should.have.status( 401 );
				res.text.should.equal( "jwt malformed" );
				done();
			});
	});
});
