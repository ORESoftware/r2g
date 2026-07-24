class R2g < Formula
  desc "Prove packages work as real downstream dependencies before release"
  homepage "https://github.com/ORESoftware/r2g"
  url "https://github.com/ORESoftware/r2g/releases/download/v0.3.0/r2g-0.3.0.tgz"
  sha256 "aa1d9c8301c4f59635930166324ee933a7b7437929a0f64ef01a47f1e436a76e"
  license "MIT"

  depends_on "node"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec.glob("bin/*")
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/r2g --version")
    assert_match "r2g", shell_output("#{bin}/r2g --help")
  end
end
