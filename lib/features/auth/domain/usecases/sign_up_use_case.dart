import '../entities/user_entity.dart';
import '../repositories/auth_repository.dart';

class SignUpUseCase {
  const SignUpUseCase(this._repository);
  final AuthRepository _repository;

  Future<UserEntity> call({
    required String email,
    required String password,
    String? fullName,
  }) =>
      _repository.signUp(email: email, password: password, fullName: fullName);
}
