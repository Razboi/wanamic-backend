
module.exports = {
	validateEmail: email => {
		const re = /\S+@\S+\.\S+/;
		return re.test( String( email ).toLowerCase());
	},
	validatePassword: password => {
		const re = /^(?=.*\d)(?=.*[a-zA-Z]).{8,}$/;
		return re.test( password );
	},
	validateUsername: username => {
		if ( username.length > 20 ) {
			return false;
		}
		const
			re = /[\w]+$/,
			notAllowedRe = /[\s.]/;
		return re.test( username ) && !notAllowedRe.test( username );
	},
	validateFullname: fullname => {
		if ( fullname.length > 30 ) {
			return false;
		}
		const
			re = /[a-z\s]+$/i,
			notAllowedRe = /[._]/;
		return re.test( fullname ) && !notAllowedRe.test( fullname );
	},
};
