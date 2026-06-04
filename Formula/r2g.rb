class R2g < Formula
  desc "Test npm packages in their packed publish format"
  homepage "https://github.com/ORESoftware/r2g"
  url "https://registry.npmjs.org/r2g/-/r2g-0.2.15.tgz"
  sha256 "7ba8057662e12db411ade94e7a08d41c2610ec898c0518ff83dd035958bbcf38"
  license "MIT"

  depends_on "node"

  def install
    ENV["r2g_skip_postinstall"] = "yes"

    inreplace "cli/r2g.sh" do |s|
      s.gsub! '$("$HOME/.oresoftware/bin/realpath" $0)',
              '$(node -e \'console.log(require("fs").realpathSync(process.argv[1]))\' "$0")'
      s.gsub! '. "$HOME/.oresoftware/bash/r2g.sh"',
              '. "$project_root/assets/shell.sh"'
      s.gsub! "Could not source r2g bash functions from .oresoftware/bash/r2g.sh.",
              "Could not source r2g bash functions from package assets."
    end

    system "npm", "install", *std_npm_args
    bin.install_symlink libexec.glob("bin/*")
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/r2g --vn")
    assert_match "usage: r2g", shell_output("#{bin}/r2g --help")
  end
end
