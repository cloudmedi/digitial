const crypto = require("crypto");

class Encryption {
	constructor(key, iv) {
		this.algorithm = "aes-256-cbc";
		this.key = key || crypto.randomBytes(32);  // Güçlü bir şifreleme anahtarı oluşturun
		this.iv = iv || crypto.randomBytes(16);   // Initialization Vector
	}

	encrypt(text) {
		const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
		let encrypted = cipher.update(text, "utf8", "hex");
		encrypted += cipher.final("hex");
		return this.iv.toString("hex") + ":" + encrypted;
	}

	decrypt(text) {
		const textParts = text.split(":");
		const iv = Buffer.from(textParts.shift(), "hex");
		const encryptedText = Buffer.from(textParts.join(":"), "hex");
		const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
		let decrypted = decipher.update(encryptedText, "hex", "utf8");
		decrypted += decipher.final("utf8");
		return decrypted;
	}
}

module.exports = Encryption;
