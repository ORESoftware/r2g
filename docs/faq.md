
## FAQ

1. What about symlinked files/folders?

Symlinks in node_modules will be ignored. But if you have symlinks elsewhere, they will be copied and tested and also published to the tarball,
because the symlinks are copied with `rsync --copy-links`, which actually copies the target files not the links.
